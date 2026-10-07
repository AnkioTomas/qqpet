/** Integer in [min, max]; the ends are half as likely, exactly like the original's helper. */
export const rand = (min: number, max: number): number => Math.round(Math.random() * (max - min) + min)
