import React from 'react';
import { TextElement } from '@/shared/types';
import { Typography } from '@/components/ui/typography';
import { useEditor } from '@/features/contexts/EditorContext';
import { cn } from '@/lib/utils';
import { elementDefaults } from '@/shared/types/config/elementDefaults';

interface TextElementComponentProps {
  element: TextElement;
}

const TextElementComponent: React.FC<TextElementComponentProps> = ({ element }) => {
  const { selectedManualEditElementId, selectElementForManualEdit } = useEditor();
  const isSelected = selectedManualEditElementId === element.id;

  const defaultTypography = (elementDefaults.text.properties as TextElement['properties']).typography;
  const typographyProps = element.properties.typography;

  const styles = {
    color: typographyProps?.color ?? defaultTypography?.color,
    fontSize: typographyProps?.fontSize ?? defaultTypography?.fontSize,
    fontWeight: typographyProps?.fontWeight ?? defaultTypography?.fontWeight,
    lineHeight: typographyProps?.lineHeight ?? defaultTypography?.lineHeight,
    textAlign: typographyProps?.textAlign ?? defaultTypography?.textAlign,
  };

  return (
    <div
      className={cn(
        'cursor-pointer p-2 rounded-md',
        isSelected ? 'outline outline-2 outline-blue-500' : ''
      )}
      onClick={(e) => {
        e.stopPropagation();
        selectElementForManualEdit(element.id);
      }}
    >
      <Typography variant="p" style={styles}>
        {element.content}
      </Typography>
    </div>
  );
};

export default TextElementComponent;