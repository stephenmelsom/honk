import { useHonk } from '../state/store.ts';
import { formatMhz, formatTone, duplexDescription } from '../radio/format.ts';
import type { Channel } from '../image/schema.ts';

export function ChannelTable() {
  const channels = useHonk((s) => s.image.channels);
  const selected = useHonk((s) => s.selectedChannel);
  const selectChannel = useHonk((s) => s.selectChannel);

  return (
    <section className="channel-table">
      <div className="grid-scroll">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>RX (MHz)</th>
              <th>Offset</th>
              <th>TX tone</th>
              <th>RX tone</th>
              <th>Mode</th>
              <th>Power</th>
            </tr>
          </thead>
          <tbody>
            {channels.map((ch, i) => (
              <ChannelRow
                key={i}
                index={i}
                channel={ch}
                selected={selected === i}
                onSelect={() => selectChannel(i)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ChannelRow({
  index,
  channel,
  selected,
  onSelect,
}: {
  index: number;
  channel: Channel | null;
  selected: boolean;
  onSelect: () => void;
}) {
  if (!channel) {
    return (
      <tr className={selected ? 'selected empty' : 'empty'} onClick={onSelect}>
        <td>{index + 1}</td>
        <td colSpan={7}>
          <em>empty</em>
        </td>
      </tr>
    );
  }
  const duplex = duplexDescription(channel.rxHz, channel.txHz);
  const offsetLabel =
    duplex.kind === 'simplex'
      ? 'simplex'
      : duplex.kind === 'off'
        ? 'TX off'
        : duplex.kind === 'split'
          ? `split ${duplex.offsetMhz.toFixed(4)} MHz`
          : `${duplex.kind === 'plus' ? '+' : '−'}${duplex.offsetMhz.toFixed(3)} MHz`;
  return (
    <tr className={selected ? 'selected' : ''} onClick={onSelect}>
      <td>{index + 1}</td>
      <td>{channel.name || <em>(unnamed)</em>}</td>
      <td>{formatMhz(channel.rxHz)}</td>
      <td>{offsetLabel}</td>
      <td>{formatTone(channel.txTone)}</td>
      <td>{formatTone(channel.rxTone)}</td>
      <td>{channel.bandwidth === 'wide' ? 'Wide' : 'Narrow'}</td>
      <td>{channel.power === 'high' ? 'High' : 'Low'}</td>
    </tr>
  );
}
