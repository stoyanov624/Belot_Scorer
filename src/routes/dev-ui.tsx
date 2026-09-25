import { type ReactNode, useRef, useState } from 'react';
import type { FeltKey, ThemeKey } from '../core/settings';
import { STRINGS } from '../core/strings';
import { FELTS, THEMES } from '../core/tokens';
import { useAppStore } from '../store/instance';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Chip } from '../ui/Chip';
import { Popover } from '../ui/Popover';
import type { Placement } from '../ui/popover-position';
import { Segmented } from '../ui/Segmented';
import { Sheet } from '../ui/Sheet';
import { feltStyle } from '../ui/theme';

/** Groups a section with a small caption; keeps the page scannable. */
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-extrabold uppercase tracking-[0.06em] text-muted">{title}</h2>
      {children}
    </section>
  );
}

const THEME_KEYS = Object.keys(THEMES) as ThemeKey[];
const FELT_KEYS = Object.keys(FELTS) as FeltKey[];
const SERIES_OPTIONS = [
  { value: 1, label: '1 мач' },
  { value: 3, label: '2 от 3' },
  { value: 5, label: '3 от 5' },
  { value: 7, label: '4 от 7' },
] as const;
const DECLARATIONS = ['Белот 2', 'Терца 2', 'Кварта 5', 'Квинта 10'];
const PLACEMENTS: { placement: Placement; label: string }[] = [
  { placement: 'below', label: 'Север' },
  { placement: 'above', label: 'Юг' },
  { placement: 'right', label: 'Запад' },
  { placement: 'left', label: 'Изток' },
];
const TYPE_SCALE = [
  { size: '64px', weight: 900, sample: 'Белот' },
  { size: '40px', weight: 900, sample: 'Победител' },
  { size: '32px', weight: 900, sample: 'Заглавие екран' },
  { size: '24px', weight: 900, sample: 'Заглавие sheet' },
  { size: '22px', weight: 900, sample: 'Хедър' },
  { size: '20px', weight: 800, sample: 'Име отбор' },
  { size: '18px', weight: 900, sample: 'Бутони, полета' },
  { size: '16px', weight: 800, sample: 'Основен текст' },
  { size: '14px', weight: 800, sample: 'Помощен текст' },
  { size: '13px', weight: 800, sample: 'ЕТИКЕТ', uppercase: true },
  { size: '11px', weight: 800, sample: 'Бадж, чип' },
];

/** DEV-only page: every UI primitive in the current theme, for comparing against the mockups. */
export function Component() {
  const theme = useAppStore((s) => s.settings.theme);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const [series, setSeries] = useState<(typeof SERIES_OPTIONS)[number]['value']>(1);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [openPlacement, setOpenPlacement] = useState<Placement | null>(null);
  const belowRef = useRef<HTMLButtonElement>(null);
  const aboveRef = useRef<HTMLButtonElement>(null);
  const rightRef = useRef<HTMLButtonElement>(null);
  const leftRef = useRef<HTMLButtonElement>(null);
  const anchors = { below: belowRef, above: aboveRef, right: rightRef, left: leftRef } as const;

  return (
    <div className="mx-auto flex max-w-[780px] flex-col gap-8 p-5">
      <h1 className="text-[32px] font-black">UI primitive gallery</h1>

      <Section title="Theme">
        <div className="flex flex-wrap gap-2">
          {THEME_KEYS.map((key) => (
            <Chip key={key} selected={theme === key} onClick={() => updateSettings({ theme: key })}>
              {STRINGS.themes[key].name}
            </Chip>
          ))}
        </div>
      </Section>

      <Section title="Felt">
        <div className="flex flex-wrap gap-3">
          {FELT_KEYS.map((key) => (
            <div key={key} className="flex flex-col items-center gap-1.5">
              <div className="h-20 w-[120px] rounded-[32px] border-[6px]" style={feltStyle(key)} />
              <span className="text-xs font-bold text-muted">{STRINGS.felts[key]}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="primary" size="md">
            Primary md
          </Button>
          <Button variant="primary" size="lg">
            Primary lg
          </Button>
          <Button variant="secondary" size="md">
            Secondary md
          </Button>
          <Button variant="secondary" size="lg">
            Secondary lg
          </Button>
          <Button variant="danger" size="md">
            Danger md
          </Button>
          <Button variant="danger" size="lg">
            Danger lg
          </Button>
          <Button variant="ghost" size="md">
            Ghost md
          </Button>
          <Button variant="ghost" size="lg">
            Ghost lg
          </Button>
          <Button variant="primary" size="md" disabled>
            Disabled
          </Button>
        </div>
      </Section>

      <Section title="Chips">
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone="a" size="sm">
            A sm
          </Chip>
          <Chip tone="a" size="md">
            A md
          </Chip>
          <Chip tone="b" size="sm">
            B sm
          </Chip>
          <Chip tone="b" size="md">
            B md
          </Chip>
          <Chip tone="neutral" size="sm">
            Neutral sm
          </Chip>
          <Chip tone="neutral" size="md">
            Neutral md
          </Chip>
          <Chip tone="neutral" size="md" selected>
            Selected
          </Chip>
          <Chip tone="neutral" size="md">
            ♠ ♣ <span className="text-suit-red">♥ ♦</span>
          </Chip>
        </div>
      </Section>

      <Section title="Segmented">
        <Segmented
          label="Брой мачове"
          options={SERIES_OPTIONS}
          value={series}
          onChange={setSeries}
        />
      </Section>

      <Section title="Avatars">
        <div className="flex flex-wrap items-end gap-4">
          {[44, 60, 68, 92].map((size) => (
            <Avatar key={`emoji-${size}`} name="Иван" emoji="🃏" size={size} ring="a" />
          ))}
          {[44, 60, 68, 92].map((size) => (
            <Avatar key={`initial-${size}`} name="Мария" emoji={null} size={size} ring="b" />
          ))}
          {[44, 60, 68, 92].map((size) => (
            <Avatar key={`line-${size}`} name="Петър" emoji="🎉" size={size} ring="line" />
          ))}
        </div>
      </Section>

      <Section title="Sheet">
        <Button variant="secondary" size="md" onClick={() => setSheetOpen(true)}>
          Open sheet
        </Button>
        <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Място: Север">
          <p className="text-[15px] text-text">Иван държи раздаването.</p>
          <p className="text-[15px] text-text">Отборът е на 87 точки.</p>
          <p className="text-[15px] text-text">Следва обявяване на договорка.</p>
        </Sheet>
      </Section>

      <Section title="Popover">
        <div className="flex flex-wrap gap-4">
          {PLACEMENTS.map(({ placement, label }) => (
            <div key={placement} className="flex flex-col items-center gap-1.5">
              <button
                ref={anchors[placement]}
                type="button"
                onClick={() => setOpenPlacement(placement)}
              >
                <Avatar name={label} emoji="🂡" size={60} ring="a" />
              </button>
              <span className="text-xs font-bold text-muted">{placement}</span>
              <Popover
                open={openPlacement === placement}
                onClose={() => setOpenPlacement(null)}
                anchor={anchors[placement]}
                placement={placement}
                label="Иван обявява"
              >
                <div className="grid grid-cols-2 gap-2">
                  {DECLARATIONS.map((declaration) => (
                    <button
                      key={declaration}
                      type="button"
                      className="h-12 rounded-2xl bg-s3 text-xs font-extrabold text-text"
                    >
                      {declaration}
                    </button>
                  ))}
                </div>
              </Popover>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Typography">
        <div className="flex flex-col gap-2">
          {TYPE_SCALE.map(({ size, weight, sample, uppercase }) => (
            <div
              key={size}
              style={{ fontSize: size, fontWeight: weight }}
              className={uppercase ? 'uppercase tracking-[0.06em]' : undefined}
            >
              {sample} <span className="text-xs text-muted">{`${size} / ${weight}`}</span>
            </div>
          ))}
          <div className="text-lg font-extrabold [font-variant-numeric:tabular-nums]">151 · 87</div>
        </div>
      </Section>
    </div>
  );
}
