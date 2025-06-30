import React from 'react';
import { EmailElement, ImageElementProperties } from '@/shared/types';
import { useEditor } from '@/features/contexts/EditorContext';
import { cn } from '@/lib/utils';
import { isPlaceholder } from '@/features/services/htmlGenerator';

interface ImageElementComponentProps {
  element: EmailElement & { type: 'image' };
}

const ImageElementComponent: React.FC<ImageElementComponentProps> = ({ element }) => {
  const { 
    selectedManualEditElementId, 
    selectElementForManualEdit,
    handlePlaceholderActivation 
  } = useEditor();
  
  const properties = element.properties as ImageElementProperties;
  const isSelected = selectedManualEditElementId === element.id;

  const image = properties.image;
  const hasPlaceholder = image?.src && isPlaceholder(image.src);

  const containerStyle: React.CSSProperties = {
    paddingTop: element.layout?.padding?.top,
    paddingRight: element.layout?.padding?.right,
    paddingBottom: element.layout?.padding?.bottom,
    paddingLeft: element.layout?.padding?.left,
    textAlign: element.layout?.align,
  };

  const imageStyle: React.CSSProperties = {
    width: image?.width || '100%',
    height: image?.height || 'auto',
    maxWidth: '100%',
    display: 'inline-block', // To respect textAlign
    borderRadius: properties.border?.radius,
    borderWidth: properties.border?.width,
    borderStyle: properties.border?.style,
    borderColor: properties.border?.color,
    objectFit: image?.objectFit,
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasPlaceholder) {
      handlePlaceholderActivation({ elementId: element.id, path: 'image.src', type: 'image' });
    } else {
      selectElementForManualEdit(element.id);
    }
  };

  const imageTag = (
    <img
      src={image?.src || 'https://via.placeholder.com/600x200'}
      alt={image?.alt || 'Email image'}
      style={imageStyle}
    />
  );

  return (
    <div
      style={containerStyle}
      onClick={handleClick}
      className={cn(
        'cursor-pointer',
        isSelected ? 'outline outline-2 outline-blue-500 outline-offset-2' : ''
      )}
    >
      {image?.linkHref ? (
        <a href={image.linkHref} target={image.linkTarget || '_blank'} onClick={(e) => e.preventDefault()}>
          {imageTag}
        </a>
      ) : (
        imageTag
      )}
    </div>
  );
};

export default ImageElementComponent;