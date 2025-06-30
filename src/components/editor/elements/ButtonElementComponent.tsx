import React from 'react';
import { ButtonElement } from '@/shared/types';
import { Button } from '@/components/ui/button';
import { useEditor } from '@/features/contexts/EditorContext';
import { cn } from '@/lib/utils';
import { elementDefaults } from '@/shared/types/config/elementDefaults';

interface ButtonElementComponentProps {
  element: ButtonElement;
}

const ButtonElementComponent: React.FC<ButtonElementComponentProps> = ({ element }) => {
  const { selectedManualEditElementId, selectElementForManualEdit } = useEditor();
  const isSelected = selectedManualEditElementId === element.id;

  const defaultProperties = elementDefaults.button.properties as ButtonElement['properties'];
  const defaultButtonProps = defaultProperties.button;
  const defaultTypography = defaultProperties.typography;

  const buttonProps = element.properties.button;
  const typographyProps = element.properties.typography;

  const styles = {
    backgroundColor: buttonProps.backgroundColor ?? defaultButtonProps.backgroundColor,
    color: buttonProps.textColor ?? defaultButtonProps.textColor,
    borderRadius: buttonProps.borderRadius ?? defaultButtonProps.borderRadius,
    border: buttonProps.border ?? defaultButtonProps.border,
    fontFamily: typographyProps?.fontFamily ?? defaultTypography?.fontFamily,
    fontSize: typographyProps?.fontSize ?? defaultTypography?.fontSize,
    fontWeight: typographyProps?.fontWeight ?? defaultTypography?.fontWeight,
    padding: '10px 20px', // Example padding, adjust as needed
  };

  const tableStyles = {
    textAlign: element.layout?.align ?? 'center',
    width: '100%',
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
      <table role="presentation" border={0} cellPadding={0} cellSpacing={0} align={tableStyles.textAlign as any} style={{ width: tableStyles.width }}>
        <tbody>
          <tr>
            <td style={{ textAlign: tableStyles.textAlign as any }}>
              <Button asChild style={styles}>
                <a href={buttonProps.href ?? '#'} target={buttonProps.target ?? '_self'}>{element.content}</a>
              </Button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default ButtonElementComponent;