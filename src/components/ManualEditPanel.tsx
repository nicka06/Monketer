import React, { useState, useEffect, useMemo } from 'react';
import { EmailElement, EmailElementProperties, TextElementProperties, HeaderElementProperties, ButtonElementProperties, ImageElementProperties, DividerElementProperties, SpacerElementProperties, Column, Row, EmailSection } from '@/shared/types'; 
import { useManualEdit } from '@/features/contexts/providers/ManualEditProvider';
import { useUIState } from '@/features/contexts/providers/UIStateProvider';
import { useProject } from '@/features/contexts/providers/ProjectProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const ManualEditPanel = () => {
  const { projectData } = useProject();
  const { selectedElementId, selectElementForManualEdit } = useUIState();
  const { updateElementProperties, saveManualChanges } = useManualEdit();

  const selectedElement = useMemo(() => {
    if (!projectData?.email_content_structured || !selectedElementId) return null;
    return projectData.email_content_structured.sections
      .flatMap(s => s.rows.flatMap(r => r.columns.flatMap(c => c.elements)))
      .find(e => e.id === selectedElementId);
  }, [projectData, selectedElementId]);

  const renderElementEditor = () => {
    if (!selectedElement) {
      return <p className="text-sm text-neutral-500">Select an element to edit its properties.</p>;
    }

    const handlePropertyChange = (key: string, value: any) => {
        updateElementProperties(selectedElement.id, { [key]: value });
    };

    const handleTypographyChange = (key: string, value: any) => {
      const newTypography = { ...(selectedElement.properties as any).typography, [key]: value };
      updateElementProperties(selectedElement.id, { typography: newTypography });
    };

    const { type, properties } = selectedElement;

    switch (type) {
      case 'header': {
        const props = properties as HeaderElementProperties;
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="header-text">Text</Label>
              <Input
                id="header-text"
                value={props.text}
                onChange={(e) => handlePropertyChange('text', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="header-level">Level</Label>
              <Select
                value={props.level}
                onValueChange={(value) => handlePropertyChange('level', value)}
              >
                <SelectTrigger id="header-level">
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="h1">H1</SelectItem>
                  <SelectItem value="h2">H2</SelectItem>
                  <SelectItem value="h3">H3</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      }
      case 'text': {
        const props = properties as TextElementProperties;
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="text-content">Text</Label>
              <Input
                id="text-content"
                value={props.text}
                onChange={(e) => handlePropertyChange('text', e.target.value)}
              />
            </div>
             <div>
              <Label>Font Size</Label>
              <Input
                value={props.typography?.fontSize || ''}
                onChange={(e) => handleTypographyChange('fontSize', e.target.value)}
              />
            </div>
          </div>
        );
      }
      case 'button': {
        const props = properties as ButtonElementProperties;
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="button-text">Text</Label>
              <Input
                id="button-text"
                value={props.text}
                onChange={(e) => handlePropertyChange('text', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="button-href">URL</Label>
              <Input
                id="button-href"
                value={props.href}
                onChange={(e) => handlePropertyChange('href', e.target.value)}
              />
            </div>
            <div>
              <Label>Background Color</Label>
              <Input
                value={props.backgroundColor || ''}
                onChange={(e) => handlePropertyChange('backgroundColor', e.target.value)}
              />
            </div>
          </div>
        );
      }
      case 'image': {
        const props = properties as ImageElementProperties;
        return (
          <div>
            <Label htmlFor="image-src">Image URL</Label>
            <Input
              id="image-src"
              value={props.src}
              onChange={(e) => handlePropertyChange('src', e.target.value)}
            />
          </div>
        );
      }
      default:
        return <p>This element type cannot be edited yet.</p>;
    }
  };

  if (!projectData?.email_content_structured) {
    return <div>Loading...</div>;
  }
  
  const allElements = projectData.email_content_structured.sections.flatMap(s => 
    s.rows.flatMap(r => r.columns.flatMap(c => c.elements))
  );

  return (
    <div className="bg-white dark:bg-neutral-950 p-4 h-full overflow-y-auto flex flex-col">
      <h3 className="text-lg font-semibold mb-4">Manual Editor</h3>
      <div className="flex-grow">
        <Accordion type="single" collapsible className="w-full" value={selectedElementId || ''}>
           {projectData.email_content_structured.sections.map((section: EmailSection) => (
              <AccordionItem value={section.id} key={section.id} className="border-b-0">
                 <AccordionTrigger>Section</AccordionTrigger>
                 <AccordionContent>
                   {section.rows.map((row: Row) => (
                      <div key={row.id} className="ml-4 border-l pl-4 my-2">
                         <p>Row</p>
                         {row.columns.map((col: Column) => (
                           <div key={col.id} className="ml-4 border-l pl-4 my-2">
                             <p>Column (Span {col.styles.gridSpan})</p>
                              {col.elements.map((element: EmailElement) => (
                                <div
                                  key={element.id}
                                  onClick={() => selectElementForManualEdit(element.id)}
                                  className={`p-2 my-1 cursor-pointer rounded ${
                                    selectedElementId === element.id
                                      ? 'bg-blue-100 dark:bg-blue-900 ring-2 ring-blue-500'
                                      : 'bg-neutral-100 dark:bg-neutral-800'
                                  }`}
                                >
                                  <p className="font-semibold">{element.type}</p>
                                  <p className="text-xs text-neutral-500">{element.id}</p>
                                </div>
                              ))}
                           </div>
                         ))}
                      </div>
                   ))}
                 </AccordionContent>
              </AccordionItem>
           ))}
        </Accordion>

        <hr className="my-6" />

        <div>
          <h4 className="text-md font-semibold mb-3">Edit Properties</h4>
          {renderElementEditor()}
        </div>
      </div>
       <Button onClick={saveManualChanges} className="mt-4">
        Save Changes
      </Button>
    </div>
  );
};

export default ManualEditPanel; 