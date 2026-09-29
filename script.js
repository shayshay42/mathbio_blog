const notes = {
  'small-models': {
    title: 'What can a small model tell us?', category: 'Dynamics',
    body: `<p>A model begins with a choice about what to keep. A cell contains far more detail than a handful of equations can describe. So does a population, a drug response, or a patch of developing tissue. The first question is which details matter for the question at hand.</p>
    <h3>Start with the question</h3><p>Suppose we want to understand whether a system returns to a steady state after a small disturbance. We might start with one variable and a rule for how it changes. That rule will omit a great deal. It can still help us think about stability.</p>
    <p class="equation" aria-label="The time derivative of x equals f of x and theta">dx / dt = f(x, θ)</p>
    <p>The useful part is the connection between an assumption and a consequence. Change the feedback, and the steady state may change. Introduce a delay, and a previously quiet system may oscillate. A small model gives us room to examine those connections.</p>
    <h3>Keep the omissions visible</h3><p>Two mechanisms can produce similar trajectories. A good fit therefore leaves questions open: which parameters can the observations constrain? What additional measurement would help distinguish the mechanisms? Under which conditions does the approximation fail?</p>
    <p>A notebook is a good place to keep those questions beside the equations. The assumptions belong on the page, where they can be challenged and revised.</p>
    <p class="reader-prompt">A question to carry forward: what is the smallest model that could prove your current explanation wrong?</p>`
  },
  'learning-dynamics': {
    title: 'Learning the dynamics between the dots', category: 'Methods',
    body: `<p>An experiment gives us observations at particular times. A dynamical model describes how a system moves between them. Learning a model from those observations asks us to connect two different kinds of information.</p>
    <h3>Observations are only part of the story</h3><p>A collection of points does not specify a unique differential equation. Different models can pass close to the same observations, especially when the measurements are sparse or noisy. The choice of model class brings assumptions into the problem before any fitting begins.</p>
    <p class="equation" aria-label="Observed y at time t sub i equals x at time t sub i plus noise epsilon sub i">y(tᵢ) = x(tᵢ) + εᵢ</p>
    <p>For example, representing the dynamics with a short list of candidate terms expresses a different prior than representing them with a neural network. Both approaches need a way to decide whether a model has learned something useful beyond the observed trajectory.</p>
    <h3>Ask more of the model</h3><p>One check is to start from a new initial condition. Another is to ask whether the learned model preserves a known qualitative behavior: a stable equilibrium, a repeating orbit, or a constraint on the state.</p>
    <p>The right check depends on the scientific purpose. A short forecast, an inferred mechanism, and a control policy place different demands on the same equations. Writing down that purpose early makes it easier to choose an honest comparison.</p>
    <p class="reader-prompt">A question to carry forward: which behavior would you need to see before trusting the dynamics between the dots?</p>`
  },
  'good-tools': {
    title: 'A small case for good tools', category: 'Field notes',
    body: `<p>The Carl Angel-5 offers a useful starting point for a notebook’s design: an enamel shell, a metal mechanism, a clear drawer, and a handle you turn by hand. Each part has a job you can see.</p>
    <h3>A page with room to think</h3><p>A research notebook can borrow that clarity. Give the main thought a little space. Put the assumptions beside the calculation. Keep the source close to the claim. Leave enough margin for the question that arrives halfway through.</p>
    <p>A pencil mark is easy to revise. That makes it well suited to work whose shape is still changing. An unfinished derivation, a sketch of a phase portrait, or a question about an experiment can all belong on the same page.</p>
    <h3>Keep the working parts</h3><p>This draft uses paper tones, fine rules, and the sharpener’s enamel colors to make a home for those thoughts. The entries can grow into longer essays, remain short working notes, or point to code that does the explaining.</p>
    <p class="reader-prompt">A question to carry forward: which small part of your setup makes it easier to begin?</p>`
  }
};

const dialog = document.querySelector('#note-dialog');
let lastNoteLink = null;
function openNote(key) {
  const note = notes[key];
  if (!note) return;
  document.querySelector('#note-title').textContent = note.title;
  document.querySelector('#note-category').textContent = note.category;
  document.querySelector('#note-content').innerHTML = note.body;
  if (!dialog.open) dialog.showModal();
  dialog.scrollTop = 0;
}
document.querySelectorAll('[data-note]').forEach(link => link.addEventListener('click', event => {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  lastNoteLink = link;
  history.pushState({notebookNote: true}, '', `#note-${link.dataset.note}`);
  openNote(link.dataset.note);
}));
function closeNote() {
  dialog.close();
  if (location.hash.startsWith('#note-')) {
    if (history.state?.notebookNote) history.back();
    else history.replaceState(null, '', '#notebook');
  }
}
document.querySelector('.close-reader').addEventListener('click', closeNote);
dialog.addEventListener('cancel', event => {
  event.preventDefault();
  closeNote();
});
dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeNote();
});
dialog.addEventListener('close', () => {
  if (!dialog.open && lastNoteLink) lastNoteLink.focus({preventScroll: true});
});
function readNoteHash() {
  const key = location.hash.startsWith('#note-') ? location.hash.slice(6) : null;
  if (key && notes[key]) openNote(key);
  else if (dialog.open) dialog.close();
}
window.addEventListener('hashchange', readNoteHash);
window.addEventListener('popstate', readNoteHash);
readNoteHash();
