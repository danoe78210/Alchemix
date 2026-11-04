import { render, screen } from '@testing-library/svelte';
import CamelotWheel from '$lib/components/CamelotWheel.svelte';

describe('CamelotWheel — taille du cadran (90 % de la taille d\'origine)', () => {
	test('le cadran occupe au plus 432 px (484 px × 0,9)', () => {
		const { container } = render(CamelotWheel, { props: { keyA: null, keyB: null } });
		const box = container.querySelector('.svg-container');
		expect(box.getAttribute('style')).toContain('max-width: 432px');
	});
});

describe('CamelotWheel — état neutre (Tâche 1.4)', () => {
	test('sans aucune clé : la roue complète (24 segments et anneaux) reste dessinée', () => {
		const { container } = render(CamelotWheel, { props: { keyA: null, keyB: null } });
		expect(container.querySelectorAll('.key-node')).toHaveLength(24);
		expect(container.querySelectorAll('.key-node circle')).toHaveLength(24);
		expect(container.querySelector('[data-testid="camelot-svg"] > circle')).toBeInTheDOM();
	});

	test('sans aucune clé : aucune valeur écrite sur la roue (ni codes, ni notes, ni libellés)', () => {
		const { container } = render(CamelotWheel, { props: { keyA: null, keyB: null } });
		expect(container.querySelectorAll('svg text')).toHaveLength(0);
		expect(container.querySelector('.deck-badge')).toBeNull();
		expect(container.querySelector('.link-arc')).toBeNull();
		expect(container.querySelector('.match-ring')).toBeNull();
		expect(screen.queryByTestId('wheel-legend')).toBeNull();
	});

	test('sans aucune clé : un cercle vert tournant entoure la roue', () => {
		render(CamelotWheel, { props: { keyA: null, keyB: null } });
		const ring = screen.getByTestId('wheel-idle-ring');
		expect(ring).toBeInTheDOM();
		expect(ring.getAttribute('stroke')).toBe('#00E676');
		expect(ring.getAttribute('r')).toBe('190');
		expect(ring.getAttribute('class')).toContain('idle-ring');
	});

	test('avec une clé seulement sur la piste A : valeurs et surbrillance A, rien pour B', () => {
		const { container } = render(CamelotWheel, { props: { keyA: '8A', keyB: null } });
		expect(screen.queryByTestId('wheel-idle-ring')).toBeNull();
		expect(screen.getByTestId('badge-a')).toBeInTheDOM();
		expect(screen.queryByTestId('badge-b')).toBeNull();
		expect(container.querySelector('.legend-item.candidate')).toBeNull();
		expect(container.querySelector('.legend-item.master')).toHaveTextContent('8A');
	});
});
