import React from 'react';
import { EmailSection } from '@/shared/types';
import { useEditor } from '@/features/contexts/EditorContext';
import RowComponent from './RowComponent';
import PendingChangeIndicator from './PendingChangeIndicator';

interface SectionComponentProps {
  section: EmailSection;
}

const SectionComponent: React.FC<SectionComponentProps> = ({ section }) => {
  const { pendingChanges } = useEditor();

  // Find if there is a pending change specifically for this section
  const sectionChange = pendingChanges.find(
    (change) => change.target_id === section.id && change.status === 'pending'
  );

  const sectionStyle: React.CSSProperties = {
    backgroundColor: section.styles.backgroundColor,
    paddingTop: section.styles.padding?.top,
    paddingRight: section.styles.padding?.right,
    paddingBottom: section.styles.padding?.bottom,
    paddingLeft: section.styles.padding?.left,
  };

  const content = (
    <div style={sectionStyle}>
      {section.elements.map(row => (
        <RowComponent key={row.id} row={row} sectionId={section.id} />
      ))}
    </div>
  );

  // If there's a pending change for this section, wrap the content
  // with the indicator. Otherwise, just render the content.
  if (sectionChange) {
    return (
      <PendingChangeIndicator change={sectionChange}>
        {content}
      </PendingChangeIndicator>
    );
  }

  return content;
};

export default SectionComponent;