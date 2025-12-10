export const isCorrectCategory = (trashItem, expectedCategory) => {
	if (!trashItem || typeof expectedCategory !== 'string') {
		return false;
	}
	const normalizedExpected = expectedCategory.trim().toLowerCase();
	const normalizedActual = String(trashItem.category ?? trashItem.type ?? '').trim().toLowerCase();
	return normalizedActual === normalizedExpected;
};
