// Recolor the blue fleece in the 597×624 original-photo cutout; no image synthesis.
// Build: swiftc -O tools/color-portrait.swift -o /tmp/color-portrait
// Run: /tmp/color-portrait assets/portrait/shayan-cutout.png assets/portrait
// Optional third argument writes the garment matte as a diagnostic PNG.
import Foundation
import ImageIO
import UniformTypeIdentifiers

struct HSV { let h: Double; let s: Double; let v: Double }
func hsv(_ r: Double, _ g: Double, _ b: Double) -> HSV {
    let high = max(r, max(g, b)), low = min(r, min(g, b)), delta = high - low
    var hue = 0.0
    if delta > 0 {
        if high == r { hue = ((g - b) / delta).truncatingRemainder(dividingBy: 6) }
        else if high == g { hue = (b - r) / delta + 2 }
        else { hue = (r - g) / delta + 4 }
        hue *= 60
        if hue < 0 { hue += 360 }
    }
    return HSV(h: hue, s: high == 0 ? 0 : delta / high, v: high)
}
func rgb(_ color: HSV) -> [Double] {
    let c = color.v * color.s, x = c * (1 - abs((color.h / 60).truncatingRemainder(dividingBy: 2) - 1))
    let m = color.v - c
    let channels: [Double]
    switch color.h {
    case ..<60: channels = [c, x, 0]
    case ..<120: channels = [x, c, 0]
    case ..<180: channels = [0, c, x]
    case ..<240: channels = [0, x, c]
    case ..<300: channels = [x, 0, c]
    default: channels = [c, 0, x]
    }
    return channels.map { $0 + m }
}
func smooth(_ low: Double, _ high: Double, _ value: Double) -> Double {
    let t = min(1, max(0, (value - low) / (high - low)))
    return t * t * (3 - 2 * t)
}
func contains(_ x: Double, _ y: Double, _ polygon: [(Double, Double)]) -> Bool {
    var inside = false, j = polygon.count - 1
    for i in polygon.indices {
        let a = polygon[i], b = polygon[j]
        if (a.1 > y) != (b.1 > y), x < (b.0 - a.0) * (y - a.1) / (b.1 - a.1) + a.0 { inside.toggle() }
        j = i
    }
    return inside
}
func writePNG(_ bytes: [UInt8], _ width: Int, _ height: Int, _ space: CGColorSpace, _ url: URL) throws {
    let provider = CGDataProvider(data: Data(bytes) as CFData)!
    let image = CGImage(width: width, height: height, bitsPerComponent: 8, bitsPerPixel: 32,
        bytesPerRow: width * 4, space: space, bitmapInfo: CGBitmapInfo(rawValue: CGImageAlphaInfo.last.rawValue),
        provider: provider, decode: nil, shouldInterpolate: false, intent: .defaultIntent)!
    guard let output = CGImageDestinationCreateWithURL(url as CFURL, UTType.png.identifier as CFString, 1, nil) else {
        throw NSError(domain: "color-portrait", code: 1, userInfo: [NSLocalizedDescriptionKey: "Cannot create \(url.path)"])
    }
    CGImageDestinationAddImage(output, image, nil)
    guard CGImageDestinationFinalize(output) else {
        throw NSError(domain: "color-portrait", code: 2, userInfo: [NSLocalizedDescriptionKey: "PNG encoding failed"])
    }
}

do {
    let args = Array(CommandLine.arguments.dropFirst())
    guard args.count == 2 || args.count == 3 else { fatalError("Usage: color-portrait INPUT.png OUTPUT_DIRECTORY [MASK.png]") }
    let input = URL(fileURLWithPath: args[0]), directory = URL(fileURLWithPath: args[1])
    let source = CGImageSourceCreateWithURL(input as CFURL, nil)!
    let image = CGImageSourceCreateImageAtIndex(source, 0, nil)!
    guard image.width == 597, image.height == 624, image.bitsPerComponent == 8, image.bitsPerPixel == 32,
          image.alphaInfo == .last, image.bitmapInfo.intersection(.byteOrderMask) != .byteOrder32Little,
          let space = image.colorSpace, space.model == .rgb else {
        fatalError("This matte is calibrated to the original 597×624 straight-alpha RGB portrait.")
    }
    let width = image.width, height = image.height
    let data = [UInt8](image.dataProvider!.data! as Data)
    var original = [UInt8](); original.reserveCapacity(width * height * 4)
    for y in 0..<height { original.append(contentsOf: data[(y * image.bytesPerRow)..<(y * image.bytesPerRow + width * 4)]) }
    var matte = [Double](repeating: 0, count: width * height)
    var values = [Double](), saturations = [Double]()
    // Protect the gray shirt opening and embroidered patch. The blue-chroma
    // test also excludes every warm gold hardware/lettering and skin pixel.
    // Blue fabric next to the zipper remains in the garment matte.
    let shirt: [(Double, Double)] = [(245,383), (303,370), (322,363), (314,373), (305,384), (284,395), (270,391)]
    let label: [(Double, Double)] = [(333,486), (347,483), (365,486), (382,492), (381,500), (365,496), (343,494), (331,493)]
    for y in 0..<height {
        for x in 0..<width {
            let p = (y * width + x) * 4
            guard original[p + 3] > 0, y >= 289, y >= 310 || x >= 323 else { continue }
            guard !contains(Double(x), Double(y), shirt), !contains(Double(x), Double(y), label) else { continue }
            let r = Double(original[p]) / 255, g = Double(original[p+1]) / 255, b = Double(original[p+2]) / 255
            let color = hsv(r, g, b)
            let hue = smooth(173, 185, color.h) * (1 - smooth(219, 235, color.h))
            let weight = hue * smooth(0.09, 0.29, color.s) * smooth(0.012, 0.04, b - r)
            matte[y * width + x] = weight
            if weight > 0.98, y >= 370 { values.append(color.v); saturations.append(color.s) }
        }
    }
    values.sort(); saturations.sort()
    guard !values.isEmpty else { fatalError("No blue fleece pixels were found.") }
    let referenceV = values[values.count / 2], referenceS = saturations[saturations.count / 2]
    let palettes: [(String, [Double])] = [("red", [170,53,50]), ("black", [52,59,55]), ("green", [71,119,91])]
    for (name, palette) in palettes {
        let target = hsv(palette[0]/255, palette[1]/255, palette[2]/255)
        var pixels = original, changed = 0
        for i in matte.indices where matte[i] > 0 {
            let p = i * 4, weight = matte[i]
            let color = hsv(Double(original[p])/255, Double(original[p+1])/255, Double(original[p+2])/255)
            // Each pixel keeps its original light and fiber variation relative
            // to the garment's median exposure; this is never a flat fill.
            // A small exposure reduction keeps the red fleece matte rather
            // than turning its brightest fibers into vivid red highlights.
            let exposure = name == "red" ? 0.86 : 1.0
            let replacement = rgb(HSV(h: target.h, s: min(1, color.s * target.s / referenceS),
                                      v: min(1, color.v * target.v / referenceV) * exposure))
            for channel in 0..<3 {
                pixels[p + channel] = UInt8(min(255, max(0, (Double(original[p + channel]) * (1 - weight)
                    + replacement[channel] * 255 * weight).rounded())))
            }
            if pixels[p..<(p+3)] != original[p..<(p+3)] { changed += 1 }
        }
        // Alpha and non-garment RGB are invariants, including hidden pixels.
        for i in matte.indices {
            let p = i * 4
            precondition(pixels[p + 3] == original[p + 3], "Alpha must remain unchanged")
            if matte[i] == 0 { precondition(pixels[p..<(p+4)] == original[p..<(p+4)], "Non-garment pixels must remain unchanged") }
        }
        let output = directory.appendingPathComponent("shayan-cutout-\(name).png")
        try writePNG(pixels, width, height, space, output)
        // Reopen the encoded PNG: verify stored output, not only working arrays.
        let savedSource = CGImageSourceCreateWithURL(output as CFURL, nil)!
        let saved = CGImageSourceCreateImageAtIndex(savedSource, 0, nil)!
        precondition(saved.width == width && saved.height == height && saved.alphaInfo == .last)
        let savedBytes = [UInt8](saved.dataProvider!.data! as Data)
        for y in 0..<height {
            let actual = savedBytes[(y * saved.bytesPerRow)..<(y * saved.bytesPerRow + width * 4)]
            let expected = pixels[(y * width * 4)..<((y + 1) * width * 4)]
            precondition(actual == expected, "PNG encoding must preserve every intended RGBA byte")
        }
        print("\(name): \(changed) garment pixels recolored; decoded PNG verified, unchanged alpha and non-garment pixels; \(output.path)")
    }
    if args.count == 3 {
        var mask = [UInt8](repeating: 255, count: width * height * 4)
        for i in matte.indices { for channel in 0..<3 { mask[i*4+channel] = UInt8((matte[i]*255).rounded()) } }
        try writePNG(mask, width, height, space, URL(fileURLWithPath: args[2]))
    }
    print("Reference fleece: saturation=\(referenceS), value=\(referenceV). Original blue PNG was not modified.")
} catch { fputs("color-portrait: \(error)\n", stderr); exit(1) }
