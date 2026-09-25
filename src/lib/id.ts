import { nanoid } from 'nanoid';

/** Ids for players, declarations, match records and photos (ADR 0005). */
export const newId = (): string => nanoid(10);
