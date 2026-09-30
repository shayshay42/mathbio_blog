// macOS 14+, Apple command-line developer tools. No generative image processing.
// Build: swiftc -O tools/cutout-portrait.swift -o /tmp/cutout-portrait
// Run: /tmp/cutout-portrait INPUT.jpg OUTPUT.png [--person] [--no-trim]
// RGB bytes are copied from ImageIO's decoded source; only alpha is changed.
import Foundation
import Vision
import ImageIO
import CoreVideo
import CryptoKit
import UniformTypeIdentifiers

struct CutoutError: Error, CustomStringConvertible {
    let description: String
    init(_ description: String) { self.description = description }
}

func run() throws {
    let args = Array(CommandLine.arguments.dropFirst())
    guard args.count >= 2 else {
        throw CutoutError("Usage: cutout-portrait INPUT.jpg OUTPUT.png [--person] [--no-trim]")
    }
    guard args.dropFirst(2).allSatisfy({ ["--person", "--no-trim"].contains($0) }) else {
        throw CutoutError("Unknown option. Supported options: --person, --no-trim")
    }
    let input = URL(fileURLWithPath: args[0]).standardizedFileURL
    let output = URL(fileURLWithPath: args[1]).standardizedFileURL
    guard input != output else { throw CutoutError("Input and output must be different files.") }
    guard !FileManager.default.fileExists(atPath: output.path) else {
        throw CutoutError("Output already exists; choose a new path to preserve it.")
    }
    guard let source = CGImageSourceCreateWithURL(input as CFURL, nil),
          let image = CGImageSourceCreateImageAtIndex(source, 0, nil),
          let colorSpace = image.colorSpace, colorSpace.model == .rgb,
          image.bitsPerComponent == 8,
          let data = image.dataProvider?.data else {
        throw CutoutError("Input must be a readable 8-bit RGB image.")
    }
    let properties = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any]
    let orientation = properties?[kCGImagePropertyOrientation] as? Int ?? 1
    guard orientation == 1 else {
        throw CutoutError("Input has EXIF rotation. Export an upright copy first; this tool never resamples source pixels.")
    }
    let width = image.width, height = image.height
    let sourceBytes = [UInt8](data as Data)
    let alpha = image.alphaInfo
    let stride = image.bitsPerPixel / 8
    let first = alpha == .first || alpha == .noneSkipFirst
    let last = alpha == .last || alpha == .noneSkipLast
    guard (stride == 3 && alpha == .none) || (stride == 4 && (first || last)) else {
        throw CutoutError("Input must use RGB, RGBX, XRGB, or straight-alpha RGBA. Premultiplied sources are rejected to avoid changing RGB.")
    }
    let littleEndian = image.bitmapInfo.intersection(.byteOrderMask) == .byteOrder32Little
    var rgba = [UInt8](repeating: 255, count: width * height * 4)
    for y in 0..<height {
        for x in 0..<width {
            let src = y * image.bytesPerRow + x * stride, dst = (y * width + x) * 4
            let indexes = stride == 3 ? [0, 1, 2] : (first ? [1, 2, 3] : [0, 1, 2])
            for c in 0..<3 {
                let index = stride == 4 && littleEndian ? 3 - indexes[c] : indexes[c]
                rgba[dst + c] = sourceBytes[src + index]
            }
            if alpha == .first || alpha == .last {
                let index = first ? 0 : 3
                rgba[dst + 3] = sourceBytes[src + (littleEndian ? 3 - index : index)]
            }
        }
    }

    let handler = VNImageRequestHandler(cgImage: image, orientation: .up, options: [:])
    func personMask() throws -> CVPixelBuffer {
        let request = VNGeneratePersonSegmentationRequest()
        request.qualityLevel = .accurate
        request.outputPixelFormat = kCVPixelFormatType_OneComponent8
        try handler.perform([request])
        guard let result = request.results?.first else { throw CutoutError("No person mask was returned.") }
        return result.pixelBuffer
    }
    var method = "VNGenerateForegroundInstanceMaskRequest"
    let mask: CVPixelBuffer
    if args.contains("--person") {
        method = "VNGeneratePersonSegmentationRequest"
        mask = try personMask()
    } else {
        do {
            let request = VNGenerateForegroundInstanceMaskRequest()
            try handler.perform([request])
            guard let result = request.results?.first, !result.allInstances.isEmpty else {
                throw CutoutError("No foreground instance was found.")
            }
            mask = try result.generateScaledMaskForImage(forInstances: result.allInstances, from: handler)
        } catch {
            fputs("Foreground mask unavailable (\(error)); trying the built-in person mask.\n", stderr)
            method = "VNGeneratePersonSegmentationRequest"
            mask = try personMask()
        }
    }
    CVPixelBufferLockBaseAddress(mask, .readOnly)
    defer { CVPixelBufferUnlockBaseAddress(mask, .readOnly) }
    guard let base = CVPixelBufferGetBaseAddress(mask) else { throw CutoutError("Mask has no readable pixels.") }
    let mw = CVPixelBufferGetWidth(mask), mh = CVPixelBufferGetHeight(mask)
    let row = CVPixelBufferGetBytesPerRow(mask), format = CVPixelBufferGetPixelFormatType(mask)
    guard format == kCVPixelFormatType_OneComponent8 || format == kCVPixelFormatType_OneComponent32Float else {
        throw CutoutError("Unsupported mask pixel format: \(format)")
    }
    func sample(_ x: Int, _ y: Int) -> Double {
        let offset = min(max(y, 0), mh - 1) * row
        let column = min(max(x, 0), mw - 1)
        if format == kCVPixelFormatType_OneComponent8 {
            return Double(base.load(fromByteOffset: offset + column, as: UInt8.self)) / 255
        }
        return Double(base.load(fromByteOffset: offset + column * 4, as: Float.self))
    }
    var minX = width, minY = height, maxX = -1, maxY = -1
    var transparent = 0, opaque = 0
    for y in 0..<height {
        for x in 0..<width {
            // Only the mask is interpolated if Vision supplies a smaller mask.
            let mx = (Double(x) + 0.5) * Double(mw) / Double(width) - 0.5
            let my = (Double(y) + 0.5) * Double(mh) / Double(height) - 0.5
            let ix = Int(floor(mx)), iy = Int(floor(my)), fx = mx - floor(mx), fy = my - floor(my)
            let value = sample(ix, iy) * (1 - fx) * (1 - fy) + sample(ix + 1, iy) * fx * (1 - fy)
                + sample(ix, iy + 1) * (1 - fx) * fy + sample(ix + 1, iy + 1) * fx * fy
            let offset = (y * width + x) * 4
            let a = Int((min(max(value, 0), 1) * Double(rgba[offset + 3])).rounded())
            rgba[offset + 3] = UInt8(a <= 2 ? 0 : a)
            if rgba[offset + 3] == 0 { transparent += 1 }
            else {
                minX = min(minX, x); minY = min(minY, y); maxX = max(maxX, x); maxY = max(maxY, y)
                if rgba[offset + 3] == 255 { opaque += 1 }
            }
        }
    }
    guard maxX >= 0, transparent > 0 else { throw CutoutError("Mask did not separate a foreground silhouette.") }
    let cropX = args.contains("--no-trim") ? 0 : max(0, minX - 12)
    let cropY = args.contains("--no-trim") ? 0 : max(0, minY - 12)
    let cropRight = args.contains("--no-trim") ? width : min(width, maxX + 13)
    let cropBottom = args.contains("--no-trim") ? height : min(height, maxY + 13)
    let outWidth = cropRight - cropX, outHeight = cropBottom - cropY
    var cropped = [UInt8](); cropped.reserveCapacity(outWidth * outHeight * 4)
    for y in cropY..<cropBottom {
        let start = (y * width + cropX) * 4
        cropped.append(contentsOf: rgba[start..<(start + outWidth * 4)])
    }
    guard let provider = CGDataProvider(data: Data(cropped) as CFData),
          let cutout = CGImage(width: outWidth, height: outHeight, bitsPerComponent: 8, bitsPerPixel: 32,
                              bytesPerRow: outWidth * 4, space: colorSpace,
                              bitmapInfo: CGBitmapInfo(rawValue: CGImageAlphaInfo.last.rawValue),
                              provider: provider, decode: nil, shouldInterpolate: false, intent: .defaultIntent),
          let destination = CGImageDestinationCreateWithURL(output as CFURL, UTType.png.identifier as CFString, 1, nil) else {
        throw CutoutError("Could not create the transparent PNG.")
    }
    CGImageDestinationAddImage(destination, cutout, nil)
    guard CGImageDestinationFinalize(destination) else { throw CutoutError("PNG encoding failed.") }
    let digest = SHA256.hash(data: try Data(contentsOf: input)).map { String(format: "%02x", $0) }.joined()
    let report: [String: Any] = ["sourceSHA256": digest, "method": method, "sourceSize": [width, height],
        "crop": ["x": cropX, "y": cropY, "width": outWidth, "height": outHeight],
        "transparentSourcePixels": transparent, "opaqueSourcePixels": opaque,
        "RGB": "Copied source bytes without color correction, synthesis, or resampling", "output": output.path]
    print(String(data: try JSONSerialization.data(withJSONObject: report, options: [.sortedKeys, .prettyPrinted]), encoding: .utf8)!)
}

do { try run() }
catch { fputs("cutout-portrait: \(error)\n", stderr); exit(1) }
