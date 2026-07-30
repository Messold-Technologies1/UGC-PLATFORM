import { parseDocumentToSections } from './legal-import.util';

describe('parseDocumentToSections', () => {
  it('splits HTML on top-level headings into sections', () => {
    const html =
      '<h2>Data Collection</h2><p>We collect data.</p>' +
      '<h2>Your Rights</h2><p>You have rights.</p>';

    const sections = parseDocumentToSections(html, 'html');

    expect(sections).toHaveLength(2);
    expect(sections[0]).toMatchObject({
      anchorId: 'data-collection',
      title: 'Data Collection',
      tocLabel: 'Data Collection',
      sortOrder: 0,
    });
    expect(sections[0].content).toContain('<p>We collect data.</p>');
    expect(sections[1]).toMatchObject({
      anchorId: 'your-rights',
      title: 'Your Rights',
      sortOrder: 1,
    });
  });

  it('converts Markdown headings and body to sections', () => {
    const md = '# Introduction\n\nHello world.\n\n# Scope\n\nApplies to everyone.';

    const sections = parseDocumentToSections(md, 'markdown');

    expect(sections).toHaveLength(2);
    expect(sections[0].title).toBe('Introduction');
    expect(sections[0].content).toContain('Hello world.');
    expect(sections[1].title).toBe('Scope');
  });

  it('uses the shallowest heading level as the section boundary', () => {
    const html =
      '<h1>Terms</h1><p>intro</p>' +
      '<h1>Usage</h1><h2>Sub</h2><p>body</p>';

    const sections = parseDocumentToSections(html, 'html');

    // h1 is the boundary; the nested h2 stays inside the second section.
    expect(sections).toHaveLength(2);
    expect(sections.map((s) => s.title)).toEqual(['Terms', 'Usage']);
    // Body headings are demoted to h3 (renderer emits <h2> for the title;
    // the sanitizer whitelist only allows h3/h4 inside a section body).
    expect(sections[1].content).toContain('<h3>Sub</h3>');
    expect(sections[1].content).not.toContain('<h2>');
  });

  it('captures content before the first heading as an Overview section', () => {
    const html = '<p>Preamble text.</p><h2>First</h2><p>body</p>';

    const sections = parseDocumentToSections(html, 'html');

    expect(sections).toHaveLength(2);
    expect(sections[0].title).toBe('Overview');
    expect(sections[0].anchorId).toBe('overview');
    expect(sections[0].content).toContain('Preamble text.');
    expect(sections[1].title).toBe('First');
  });

  it('falls back to a single section when there are no headings', () => {
    const html = '<p>Just a paragraph.</p><p>And another.</p>';

    const sections = parseDocumentToSections(html, 'html');

    expect(sections).toHaveLength(1);
    expect(sections[0].title).toBe('Document');
    expect(sections[0].content).toContain('Just a paragraph.');
    expect(sections[0].content).toContain('And another.');
  });

  it('de-duplicates anchor ids derived from identical headings', () => {
    const html =
      '<h2>Details</h2><p>a</p><h2>Details</h2><p>b</p>';

    const sections = parseDocumentToSections(html, 'html');

    expect(sections.map((s) => s.anchorId)).toEqual(['details', 'details-2']);
  });

  it('generates a fallback anchor when the heading has no url-safe characters', () => {
    const html = '<h2>@@@</h2><p>body</p>';

    const sections = parseDocumentToSections(html, 'html');

    expect(sections[0].anchorId).toMatch(/^[a-z0-9-]+$/);
    expect(sections[0].content).toContain('body');
  });

  it('descends through a single wrapper element to find the heading flow', () => {
    const html =
      '<div><h2>Alpha</h2><p>one</p><h2>Beta</h2><p>two</p></div>';

    const sections = parseDocumentToSections(html, 'html');

    expect(sections.map((s) => s.title)).toEqual(['Alpha', 'Beta']);
  });
});
