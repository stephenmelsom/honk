import { useHonk } from '../state/store.ts';
import { compactChannels, deleteSlot, insertEmptySlot, sortChannels } from '../radio/organize.ts';
import type { Channel } from '../image/schema.ts';
import { InlineConfirmButton } from './InlineConfirmButton.tsx';

export function ChannelOrganizer() {
  const channels = useHonk((s) => s.image.channels);
  const selected = useHonk((s) => s.selectedChannel);
  const replaceChannels = useHonk((s) => s.replaceChannels);
  const selectedLabel = selected + 1;
  const programmedCount = channels.filter((channel) => channel !== null).length;

  const apply = (next: (Channel | null)[], nextSelected = selected) => {
    replaceChannels(next, nextSelected);
  };

  return (
    <aside className="editor organizer-editor">
      <h2>Organize channels</h2>

      <section className="organizer-section">
        <h3>Whole list</h3>
        <p className="muted small">
          Applies to all {channels.length} slots. {programmedCount} channels are programmed.
        </p>
        <div className="organizer-actions">
          <button type="button" onClick={() => apply(compactChannels(channels), 0)}>
            Compact gaps
          </button>
          <button type="button" onClick={() => apply(sortChannels(channels, 'rx'), 0)}>
            Sort by frequency
          </button>
          <button type="button" onClick={() => apply(sortChannels(channels, 'name'), 0)}>
            Sort by name
          </button>
        </div>
      </section>

      <section className="organizer-section">
        <h3>Selected slot</h3>
        <p className="muted small">
          Channel {selectedLabel} is selected in the table.
        </p>
        <div className="organizer-actions">
          <InlineConfirmButton
            label="Insert empty here"
            confirmLabel={`Insert at ${selectedLabel}?`}
            onConfirm={() => apply(insertEmptySlot(channels, selected), selected)}
          />
          <InlineConfirmButton
            label="Delete this slot"
            confirmLabel={`Delete slot ${selectedLabel}?`}
            onConfirm={() => apply(deleteSlot(channels, selected), selected)}
          />
        </div>
      </section>
    </aside>
  );
}
