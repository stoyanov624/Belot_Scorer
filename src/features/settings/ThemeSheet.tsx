import { type KeyboardEvent, useId } from 'react';
import { FeltKeySchema, ThemeKeySchema } from '../../core/settings';
import { STRINGS } from '../../core/strings';
import { THEMES } from '../../core/tokens';
import { useAppStore } from '../../store/instance';
import { Button } from '../../ui/Button';
import { cx } from '../../ui/cx';
import { nextRadioIndex } from '../../ui/radio-nav';
import { Sheet, SheetActions } from '../../ui/Sheet';
import { feltStyle } from '../../ui/theme';

const S = STRINGS.theme;
const LABEL = 'text-[13px] font-extrabold uppercase tracking-[0.06em] text-muted';

export function ThemeSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title={S.title}>
      {open && <ThemeForm onDone={onClose} />}
    </Sheet>
  );
}

function ThemeForm({ onDone }: { onDone: () => void }) {
  const theme = useAppStore((s) => s.settings.theme);
  const felt = useAppStore((s) => s.settings.felt);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const themeLabelId = useId();
  const feltLabelId = useId();

  const themeTabStop = Math.max(0, ThemeKeySchema.options.indexOf(theme));
  const onThemeKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next = nextRadioIndex(event, index, ThemeKeySchema.options.length);
    if (next === null) return;
    event.preventDefault();
    const key = ThemeKeySchema.options[next];
    if (key) updateSettings({ theme: key });
    event.currentTarget.parentElement
      ?.querySelectorAll<HTMLButtonElement>('[role="radio"]')
      [next]?.focus();
  };

  const feltTabStop = Math.max(0, FeltKeySchema.options.indexOf(felt));
  const onFeltKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next = nextRadioIndex(event, index, FeltKeySchema.options.length);
    if (next === null) return;
    event.preventDefault();
    const key = FeltKeySchema.options[next];
    if (key) updateSettings({ felt: key });
    event.currentTarget.parentElement
      ?.querySelectorAll<HTMLButtonElement>('[role="radio"]')
      [next]?.focus();
  };

  return (
    <>
      <fieldset className="m-0 flex min-w-0 flex-col gap-2.5 border-0 p-0">
        <legend id={themeLabelId} className={cx(LABEL, 'p-0')}>
          {S.themes}
        </legend>
        <div role="radiogroup" aria-labelledby={themeLabelId} className="grid grid-cols-2 gap-2.5">
          {ThemeKeySchema.options.map((key, index) => {
            const t = THEMES[key];
            const selected = theme === key;
            return (
              // biome-ignore lint/a11y/useSemanticElements: ARIA radio pattern; native radio inputs can't be styled this way without extra markup
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={selected}
                tabIndex={index === themeTabStop ? 0 : -1}
                onClick={() => updateSettings({ theme: key })}
                onKeyDown={(event) => onThemeKeyDown(event, index)}
                // Each card previews its own theme, so it uses that theme's values, not the page's.
                style={{
                  background: `${t.glow}, ${t.bg}`,
                  color: t.text,
                  borderColor: selected ? t.a : 'transparent',
                }}
                className="flex min-h-[92px] flex-col items-start gap-2 rounded-[20px] border-2 p-3.5 text-left transition-transform active:scale-[0.98]"
              >
                <span aria-hidden className="flex gap-1.5">
                  <span className="size-4 rounded-full" style={{ background: t.a }} />
                  <span className="size-4 rounded-full" style={{ background: t.b }} />
                </span>
                <span className="text-base font-black">{STRINGS.themes[key].name}</span>
                <span className="text-xs font-bold" style={{ color: t.muted }}>
                  {STRINGS.themes[key].sub}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="m-0 flex min-w-0 flex-col gap-2.5 border-0 p-0">
        <legend id={feltLabelId} className={cx(LABEL, 'p-0')}>
          {S.felts}
        </legend>
        <div role="radiogroup" aria-labelledby={feltLabelId} className="grid grid-cols-2 gap-2.5">
          {FeltKeySchema.options.map((key, index) => (
            // biome-ignore lint/a11y/useSemanticElements: ARIA radio pattern; native radio inputs can't be styled this way without extra markup
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={felt === key}
              tabIndex={index === feltTabStop ? 0 : -1}
              onClick={() => updateSettings({ felt: key })}
              onKeyDown={(event) => onFeltKeyDown(event, index)}
              className={cx(
                'flex flex-col items-stretch gap-2 rounded-[20px] border-2 bg-s2 p-2.5 text-base font-extrabold transition-transform active:scale-[0.98]',
                felt === key ? 'border-team-a' : 'border-transparent',
              )}
            >
              <span aria-hidden className="h-14 rounded-xl border-4" style={feltStyle(key)} />
              {STRINGS.felts[key]}
            </button>
          ))}
        </div>
      </fieldset>

      <SheetActions className="flex flex-col">
        <Button variant="primary" size="lg" onClick={onDone}>
          {S.done}
        </Button>
      </SheetActions>
    </>
  );
}
