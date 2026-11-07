import { render, screen } from '@testing-library/svelte';
import StemIcon from '$lib/components/StemIcon.svelte';

describe('StemIcon — icône d\'un stem, lisible sans texte', () => {
	test.each([
		['vocals', 'Vocals'],
		['drums', 'Drums'],
		['bass', 'Bass'],
		['other', 'Other'],
	])('le stem %s a une icône nommée en anglais « %s »', (stem, name) => {
		render(StemIcon, { props: { stem, color: '#00E676' } });
		const icon = screen.getByTestId(`icon-${stem}`);
		expect(icon).toHaveAttribute('aria-label', name);
		expect(icon.tagName.toLowerCase()).toBe('svg');
	});
});
