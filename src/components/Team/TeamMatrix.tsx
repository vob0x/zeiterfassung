import { useMemo } from 'react';
import { TimeEntry, TeamMember } from '@/types';
import { useI18n } from '../../i18n';
import { computeUnionMs } from '../../lib/utils';

interface TeamMatrixProps {
  dimension: 'stakeholder' | 'project';
  entries: TimeEntry[];
  members: TeamMember[];
}

function getIntensityColor(hours: number): { background: string; borderColor: string } {
  if (hours === 0) return { background: 'var(--surface-hover)', borderColor: 'var(--border)' };
  if (hours < 2) return { background: 'rgba(16, 185, 129, 0.4)', borderColor: 'rgba(16, 185, 129, 0.3)' };
  if (hours < 5) return { background: 'rgba(16, 185, 129, 0.6)', borderColor: 'rgba(16, 185, 129, 0.4)' };
  if (hours < 10) return { background: 'rgba(234, 179, 8, 0.6)', borderColor: 'rgba(202, 138, 4, 0.4)' };
  if (hours < 20) return { background: 'rgba(234, 88, 12, 0.6)', borderColor: 'rgba(194, 65, 12, 0.4)' };
  return { background: 'rgba(239, 68, 68, 0.6)', borderColor: 'rgba(220, 38, 38, 0.4)' };
}

export function TeamMatrix({ dimension, entries, members }: TeamMatrixProps) {
  const { t } = useI18n();
  const { items, memberIds, matrix, totals } = useMemo(() => {
    const isStakeholder = dimension === 'stakeholder';

    // Extract unique dimension values — flatten stakeholder arrays
    const uniqueItemSet = new Set<string>();
    entries.forEach((e) => {
      if (isStakeholder) {
        const shArray = Array.isArray(e.stakeholder) ? e.stakeholder : [e.stakeholder];
        shArray.forEach((sh) => { if (sh) uniqueItemSet.add(sh); });
      } else {
        if (e.projekt) uniqueItemSet.add(e.projekt);
      }
    });
    const uniqueItems = Array.from(uniqueItemSet).sort();

    // Use display_name for column headers, user_id for data matching
    const memberIdList = members.map((m) => m.display_name || m.user_id).sort();
    const memberUserIds = members.reduce<Record<string, string>>((acc, m) => {
      acc[m.display_name || m.user_id] = m.user_id;
      return acc;
    }, {});

    const matrix: Record<string, Record<string, number>> = {};
    const itemTotals: Record<string, number> = {};
    const memberTotals: Record<string, number> = {};

    // Initialize
    for (const item of uniqueItems) {
      matrix[item] = {};
      itemTotals[item] = 0;
      for (const memberId of memberIdList) {
        matrix[item][memberId] = 0;
      }
    }

    for (const memberId of memberIdList) {
      memberTotals[memberId] = 0;
    }

    // Fill matrix
    for (const item of uniqueItems) {
      for (const memberId of memberIdList) {
        const uid = memberUserIds[memberId];
        const memberItemEntries = entries.filter((e) => {
          const matchesDimension = isStakeholder
            ? (Array.isArray(e.stakeholder) ? e.stakeholder : [e.stakeholder]).includes(item)
            : e.projekt === item;
          return matchesDimension && e.user_id === uid;
        });

        let total = 0;
        const dates = new Set(memberItemEntries.map((e) => e.date));
        for (const date of dates) {
          const dateEntries = memberItemEntries.filter((e) => e.date === date);
          total += computeUnionMs(dateEntries) / (1000 * 60 * 60);
        }

        matrix[item][memberId] = total;
        itemTotals[item] += total;
        memberTotals[memberId] += total;
      }
    }

    return { items: uniqueItems, memberIds: memberIdList, matrix, totals: { item: itemTotals, member: memberTotals } };
  }, [dimension, entries, members]);

  if (items.length === 0 || memberIds.length === 0) {
    return <div style={{ color: 'var(--text-muted)' }}>{t('dash.noData')}</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="p-2 text-left text-sm font-semibold border" style={{ color: 'var(--text-muted)', background: 'var(--surface-hover)', borderColor: 'var(--border)' }}>
              {dimension === 'stakeholder' ? t('label.stakeholder') : t('label.projekt')}
            </th>
            {memberIds.map((memberId) => (
              <th
                key={memberId}
                className="p-2 text-center text-sm font-semibold border"
                style={{ color: 'var(--text-secondary)', background: 'var(--surface-hover)', borderColor: 'var(--border)' }}
              >
                {memberId}
              </th>
            ))}
            <th className="p-2 text-center text-sm font-semibold border" style={{ color: 'var(--neon-cyan)', background: 'var(--surface-hover)', borderColor: 'var(--border)' }}>
              {t('team.total')}
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item}>
              <td className="p-2 text-sm font-medium border sticky left-0" style={{ color: 'var(--text-secondary)', background: 'var(--surface)', borderColor: 'var(--border)' }}>
                {item}
              </td>
              {memberIds.map((memberId) => {
                const hours = matrix[item][memberId];
                return (
                  <td
                    key={`${item}-${memberId}`}
                    className={`p-2 text-center text-sm font-medium border ${getIntensityColor(hours)}`}
                    style={{ color: 'var(--text)', borderColor: 'var(--border)' }}
                  >
                    {hours > 0 ? hours.toFixed(1) : '—'}
                  </td>
                );
              })}
              <td className="p-2 text-center text-sm font-semibold border" style={{ color: '#cffafe', background: 'var(--surface-solid)', borderColor: 'var(--border)' }}>
                {(totals.item[item] || 0).toFixed(1)}
              </td>
            </tr>
          ))}
          <tr style={{ borderTop: '2px solid var(--border)' }}>
            <td className="p-2 text-sm font-semibold border" style={{ color: 'var(--neon-cyan)', background: 'var(--surface-solid)', borderColor: 'var(--border)' }}>
              {t('team.total')}
            </td>
            {memberIds.map((memberId) => (
              <td
                key={`total-${memberId}`}
                className="p-2 text-center text-sm font-semibold border"
                style={{ color: '#cffafe', background: 'var(--surface-solid)', borderColor: 'var(--border)' }}
              >
                {(totals.member[memberId] || 0).toFixed(1)}
              </td>
            ))}
            <td className="p-2 text-center text-sm font-bold border" style={{ color: 'var(--neon-cyan)', background: 'var(--surface-hover)', borderColor: 'var(--border)' }}>
              {Object.values(totals.member).reduce((a, b) => a + b, 0).toFixed(1)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
