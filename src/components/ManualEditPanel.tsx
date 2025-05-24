import React, { useState, useEffect } from 'react';
import { EmailElement, EmailElementProperties, TextElementProperties, HeaderElementProperties, ButtonElementProperties, ImageElementProperties, DividerElementProperties, SpacerElementProperties, EmailElementLayout } from '@/shared/types'; 
import { useEditor } from '@/features/contexts/EditorContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X } from 'lucide-react';

interface ManualEditPanelProps {
  selectedElement: EmailElement;
}

export const ManualEditPanel: React.FC<ManualEditPanelProps> = ({ selectedElement }) => {
  const {
    updateElementProperty,
    commitManualEditsToDatabase,
    selectElementForManualEdit,
  } = useEditor();

  // Local state for form inputs, initialized from selectedElement
  const [editableProperties, setEditableProperties] = useState<Partial<EmailElementProperties>>({});
  const [editableContent, setEditableContent] = useState<string | undefined>(selectedElement.content);
  const [editableLayout, setEditableLayout] = useState<Partial<EmailElementLayout>>(selectedElement.layout || {});

  useEffect(() => {
    setEditableProperties(JSON.parse(JSON.stringify(selectedElement.properties || {})));
    setEditableContent(selectedElement.content);
    setEditableLayout(JSON.parse(JSON.stringify(selectedElement.layout || {})));
  }, [selectedElement]);

  const handlePropertyChange = (propertyPath: string, value: any) => {
    // For top-level properties like 'content' or 'type' (though type shouldn't be changed here)
    if (propertyPath === 'content') {
      setEditableContent(value as string);
      updateElementProperty(selectedElement.id, 'content', value);
    } else if (propertyPath.startsWith('layout.')) {
      const layoutProperty = propertyPath.substring('layout.'.length);
      setEditableLayout(prev => {
        const newLayout = {...prev, [layoutProperty]: value };
        updateElementProperty(selectedElement.id, propertyPath, value);
        return newLayout;
      });
    } else {
      // For nested properties within 'properties' object
      setEditableProperties(prev => {
        // Simple deep copy for one level of nesting, extend if more levels are needed
        const newProps = JSON.parse(JSON.stringify(prev));
        const keys = propertyPath.split('.');
        let current = newProps;
        for (let i = 0; i < keys.length - 1; i++) {
          current = current[keys[i]] = current[keys[i]] || {};
        }
        current[keys[keys.length - 1]] = value;
        updateElementProperty(selectedElement.id, `properties.${propertyPath}`, value);
        return newProps;
      });
    }
  };

  const renderPropertyInputs = () => {
    switch (selectedElement.type) {
      case 'text':
        const textProps = editableProperties as TextElementProperties;
        return (
          <div className="space-y-2">
            <Label htmlFor="textContent">Text Content</Label>
            <Input 
              id="textContent" 
              value={editableContent || ''} 
              onChange={(e) => handlePropertyChange('content', e.target.value)} 
            />
            <Label htmlFor="textFontFamily">Font Family</Label>
            <Input
              id="textFontFamily"
              value={textProps.fontFamily || ''}
              onChange={(e) => handlePropertyChange('properties.fontFamily', e.target.value)}
              placeholder="e.g., Arial, sans-serif"
            />
            <Label htmlFor="textAlign">Text Align</Label>
            <select
              id="textAlign"
              value={textProps.align || 'left'}
              onChange={(e) => handlePropertyChange('properties.align', e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
            {/* Add more inputs for TextElementProperties if needed */}
          </div>
        );
      case 'header':
        const headerProps = editableProperties as HeaderElementProperties;
        return (
          <div className="space-y-2">
            <Label htmlFor="headerContent">Header Text</Label>
            <Input 
              id="headerContent" 
              value={editableContent || ''} 
              onChange={(e) => handlePropertyChange('content', e.target.value)} 
            />
            <Label htmlFor="headerLevel">Level (h1-h6)</Label>
            <select
              id="headerLevel"
              value={headerProps.level || 'h2'}
              onChange={(e) => handlePropertyChange('properties.level', e.target.value as any)}
              className="w-full p-2 border rounded"
            >
              <option value="h1">H1</option>
              <option value="h2">H2</option>
              <option value="h3">H3</option>
              <option value="h4">H4</option>
              <option value="h5">H5</option>
              <option value="h6">H6</option>
            </select>
            <Label htmlFor="headerFontFamily">Font Family</Label>
            <Input
              id="headerFontFamily"
              value={headerProps.fontFamily || ''}
              onChange={(e) => handlePropertyChange('properties.fontFamily', e.target.value)}
              placeholder="e.g., Arial, sans-serif"
            />
            <Label htmlFor="headerAlign">Text Align</Label>
            <select
              id="headerAlign"
              value={headerProps.align || 'left'}
              onChange={(e) => handlePropertyChange('properties.align', e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </div>
        );
      case 'button':
        const buttonProps = editableProperties as ButtonElementProperties;
        return (
          <div className="space-y-2">
            <Label htmlFor="buttonText">Button Text</Label>
            <Input 
              id="buttonText" 
              value={editableContent || ''} 
              onChange={(e) => handlePropertyChange('content', e.target.value)} 
            />
            <Label htmlFor="buttonHref">Link URL</Label>
            <Input 
              id="buttonHref" 
              value={buttonProps.button?.href || ''} 
              onChange={(e) => handlePropertyChange('button.href', e.target.value)} 
            />
            <Label htmlFor="buttonBgColor">Background Color</Label>
            <Input 
              id="buttonBgColor" 
              value={buttonProps.button?.backgroundColor || ''} 
              onChange={(e) => handlePropertyChange('button.backgroundColor', e.target.value)} 
              placeholder="#RRGGBB"
            />
            <Label htmlFor="buttonTextColor">Text Color</Label>
            <Input 
              id="buttonTextColor" 
              value={buttonProps.button?.textColor || ''} 
              onChange={(e) => handlePropertyChange('button.textColor', e.target.value)} 
              placeholder="#RRGGBB"
            />
          </div>
        );
      case 'image':
        const imageProps = editableProperties as ImageElementProperties;
        return (
          <div className="space-y-2">
            <Label htmlFor="imageSrc">Image URL (src)</Label>
            <Input 
              id="imageSrc" 
              value={imageProps.image?.src || ''} 
              onChange={(e) => handlePropertyChange('image.src', e.target.value)} 
            />
            <Label htmlFor="imageAlt">Alt Text</Label>
            <Input 
              id="imageAlt" 
              value={imageProps.image?.alt || ''} 
              onChange={(e) => handlePropertyChange('image.alt', e.target.value)} 
            />
            <Label htmlFor="imageWidth">Width</Label>
            <Input 
              id="imageWidth" 
              value={imageProps.image?.width || ''} 
              onChange={(e) => handlePropertyChange('image.width', e.target.value)} 
              placeholder="e.g., 100px or 100%"
            />
            <Label htmlFor="imageHeight">Height</Label>
            <Input 
              id="imageHeight" 
              value={imageProps.image?.height || ''} 
              onChange={(e) => handlePropertyChange('image.height', e.target.value)} 
              placeholder="e.g., 100px or auto"
            />
            <Label htmlFor="imageLinkHref">Link URL (optional)</Label>
            <Input 
              id="imageLinkHref" 
              value={imageProps.image?.linkHref || ''} 
              onChange={(e) => handlePropertyChange('image.linkHref', e.target.value)} 
            />
          </div>
        );
      case 'divider':
        const dividerProps = editableProperties as DividerElementProperties;
        return (
          <div className="space-y-2">
            <Label htmlFor="dividerColor">Color</Label>
            <Input 
              id="dividerColor" 
              value={dividerProps.divider?.color || ''} 
              onChange={(e) => handlePropertyChange('divider.color', e.target.value)} 
              placeholder="#RRGGBB or transparent"
            />
            <Label htmlFor="dividerHeight">Height</Label>
            <Input 
              id="dividerHeight" 
              value={dividerProps.divider?.height || ''} 
              onChange={(e) => handlePropertyChange('divider.height', e.target.value)} 
              placeholder="e.g., 1px"
            />
            <Label htmlFor="dividerWidth">Width</Label>
            <Input 
              id="dividerWidth" 
              value={dividerProps.divider?.width || ''} 
              onChange={(e) => handlePropertyChange('divider.width', e.target.value)} 
              placeholder="e.g., 100% or 50px"
            />
          </div>
        );
      case 'spacer':
        const spacerProps = editableProperties as SpacerElementProperties;
        return (
          <div className="space-y-2">
            <Label htmlFor="spacerHeight">Height</Label>
            <Input 
              id="spacerHeight" 
              value={spacerProps.spacer?.height || ''} 
              onChange={(e) => handlePropertyChange('spacer.height', e.target.value)} 
              placeholder="e.g., 20px"
              type="text" // Use text for now, can be number with validation
            />
          </div>
        );
      // Add cases for other element types (Subtext, Quote, etc.)
      default:
        return <p>No specific editor for element type: {selectedElement.type}</p>;
    }
  };

  const renderLayoutInputs = () => {
    return (
      <div className="space-y-2 mt-4">
        <h4 className="font-semibold">Layout & Padding (CSS units)</h4>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="paddingTop">Padding Top</Label>
            <Input id="paddingTop" value={editableLayout.padding?.top || ''} onChange={(e) => handlePropertyChange('layout.padding.top', e.target.value)} />
          </div>
          <div>
            <Label htmlFor="paddingBottom">Padding Bottom</Label>
            <Input id="paddingBottom" value={editableLayout.padding?.bottom || ''} onChange={(e) => handlePropertyChange('layout.padding.bottom', e.target.value)} />
          </div>
          <div>
            <Label htmlFor="paddingLeft">Padding Left</Label>
            <Input id="paddingLeft" value={editableLayout.padding?.left || ''} onChange={(e) => handlePropertyChange('layout.padding.left', e.target.value)} />
          </div>
          <div>
            <Label htmlFor="paddingRight">Padding Right</Label>
            <Input id="paddingRight" value={editableLayout.padding?.right || ''} onChange={(e) => handlePropertyChange('layout.padding.right', e.target.value)} />
          </div>
          <div>
            <Label htmlFor="backgroundColor">Background Color</Label>
            <Input id="backgroundColor" value={editableLayout.backgroundColor || ''} onChange={(e) => handlePropertyChange('layout.backgroundColor', e.target.value)} placeholder="#FFFFFF or transparent"/>
          </div>
        </div>
      </div>
    );
  }

  if (!selectedElement) {
    return null; 
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between p-4 border-b">
        <CardTitle className="text-lg">Edit: {selectedElement.type} ({selectedElement.id.substring(0,6)}...)</CardTitle>
        <Button variant="ghost" size="icon" onClick={() => selectElementForManualEdit(null)}>
          <X className="h-5 w-5" />
        </Button>
      </CardHeader>
      <ScrollArea className="flex-grow">
        <CardContent className="p-4 space-y-4">
          {renderPropertyInputs()}
          {renderLayoutInputs()}
          {/* Placeholder for more complex property editors (e.g., typography, color pickers) */}
        </CardContent>
      </ScrollArea>
      <CardFooter className="p-4 border-t">
        <Button onClick={commitManualEditsToDatabase} className="w-full">Save to Database</Button>
      </CardFooter>
    </Card>
  );
};

export default ManualEditPanel; 