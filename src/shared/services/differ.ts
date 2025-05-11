/**
 * Core DifferV2 Implementation
 * 
 * This is a platform-agnostic implementation of the template diffing algorithm.
 * It can be used in both browser/Node.js and Deno environments through adapter layers.
 */

// Import types for local use within this module
import type {
  EmailTemplate,
  EmailSection,
  EmailElement,
  ElementType,
  PropertyChange,
  ElementDiff,
  SectionDiff,
  TemplateDiffResult
} from '../types';

// Re-export these types so other modules can import them directly from this service file if needed
export type {
  EmailTemplate,
  EmailSection,
  EmailElement,
  ElementType,
  PropertyChange,
  ElementDiff,
  SectionDiff,
  TemplateDiffResult
};

export class DifferCore {
  /**
   * Creates a new instance of the DifferCore
   * @param _ Lodash library instance passed from the environment-specific adapter
   */
  constructor(private _: any) {}

  /**
   * Compares two EmailTemplate objects.
   * @param oldTemplate The previous version of the template.
   * @param newTemplate The current version of the template.
   * @returns A TemplateDiffResult object detailing the changes.
   */
  public diffTemplates(oldTemplate: EmailTemplate, newTemplate: EmailTemplate): TemplateDiffResult {
    console.log(`[DifferV2] Diffing templates ${oldTemplate.id} -> ${newTemplate.id}`);
    
    const nameChanged = oldTemplate.name !== newTemplate.name;
    const globalStyleChanges = this.diffProperties(oldTemplate.globalStyles, newTemplate.globalStyles);
    const sectionDiffs = this.diffSections(oldTemplate.sections, newTemplate.sections);
    const sectionsChanged = sectionDiffs.some(s => s.status !== 'unchanged');

    const result: TemplateDiffResult = {
      hasChanges: nameChanged || !!globalStyleChanges || sectionsChanged,
      nameChange: nameChanged ? { oldValue: oldTemplate.name, newValue: newTemplate.name } : undefined,
      globalStyleChanges: globalStyleChanges || undefined,
      sectionDiffs: sectionDiffs,
    };
        
    return result;
  }

  /**
   * Compares two arrays of EmailSection objects.
   * Uses section IDs to track additions, removals, modifications, and moves.
   * @param oldSections The previous list of sections.
   * @param newSections The current list of sections.
   * @returns An array of SectionDiff objects.
   */
  private diffSections(oldSections: EmailSection[], newSections: EmailSection[]): SectionDiff[] {
    const diffs: SectionDiff[] = [];
    const oldSectionMap = new Map(oldSections.map((sec, index) => [sec.id, { section: sec, index }]));
    const newSectionMap = new Map(newSections.map((sec, index) => [sec.id, { section: sec, index }]));
    const handledNewIds = new Set<string>();

    // 1. Check old sections against new ones
    oldSections.forEach((oldSecData, oldIndex) => {
      const oldId = oldSecData.id;
      const newEntry = newSectionMap.get(oldId);

      if (newEntry) {
        // Section exists in both
        const newSecData = newEntry.section;
        const newIndex = newEntry.index;
        handledNewIds.add(oldId);

        const styleChanges = this.diffProperties(oldSecData.styles, newSecData.styles);
        const elementDiffs = this.diffElements(oldSecData.elements, newSecData.elements);
        const moved = oldIndex !== newIndex;
        const hasElementChanges = elementDiffs.some(diff => diff.status !== 'unchanged');

        if (styleChanges || hasElementChanges || moved) {
          const diff: SectionDiff = {
            status: 'modified',
            sectionId: oldId,
            elementDiffs: elementDiffs,
            styleChanges: styleChanges || undefined,
            oldValue: oldSecData,
            newValue: newSecData,
            moved: moved ? { fromIndex: oldIndex, toIndex: newIndex } : undefined,
          };
          diffs.push(diff);
        } else {
          diffs.push({
            status: 'unchanged',
            sectionId: oldId,
            elementDiffs: [], // No need to include unchanged elements if section is unchanged overall
          });
        }
      } else {
        // Section removed
        diffs.push({
          status: 'removed',
          sectionId: oldId,
          oldValue: oldSecData,
          elementDiffs: [], // Elements are implicitly removed with the section
        });
      }
    });

    // 2. Check for added sections
    newSections.forEach((newSecData, newIndex) => {
      if (!handledNewIds.has(newSecData.id)) {
        diffs.push({
          status: 'added',
          sectionId: newSecData.id,
          newValue: newSecData,
          // Map all elements within the new section as 'added'
          elementDiffs: newSecData.elements.map(el => ({
              status: 'added',
              elementId: el.id,
              elementType: el.type,
              newValue: el
          }))
        });
      }
    });
    
    return diffs;
  }

  /**
   * Compares two arrays of EmailElement objects within a section.
   * Uses element IDs to track additions, removals, modifications, and moves.
   * @param oldElements The previous list of elements.
   * @param newElements The current list of elements.
   * @returns An array of ElementDiff objects.
   */
  private diffElements(oldElements: EmailElement[], newElements: EmailElement[]): ElementDiff[] {
    const diffs: ElementDiff[] = [];
    const oldElementMap = new Map(oldElements.map((el, index) => [el.id, { element: el, index }]));
    const newElementMap = new Map(newElements.map((el, index) => [el.id, { element: el, index }]));
    const handledNewIds = new Set<string>();

    // 1. Check old elements against new ones (for modifications, removals, moves)
    oldElements.forEach((oldElData, oldIndex) => {
      const oldId = oldElData.id;
      const newEntry = newElementMap.get(oldId);

      if (newEntry) {
        // Element exists in both - check for modification or move
        const newElData = newEntry.element;
        const newIndex = newEntry.index;
        handledNewIds.add(oldId);

        const contentChanged = oldElData.content !== newElData.content;
        const layoutChanges = this.diffProperties(oldElData.layout, newElData.layout);
        const propertyChanges = this.diffProperties(oldElData.properties, newElData.properties);
        const moved = oldIndex !== newIndex;

        if (contentChanged || layoutChanges || propertyChanges || moved) {
          const changes: ElementDiff['changes'] = {};
          if (contentChanged) changes.content = { oldValue: oldElData.content, newValue: newElData.content };
          if (layoutChanges) changes.layout = layoutChanges;
          if (propertyChanges) changes.properties = propertyChanges;
          
          const diff: ElementDiff = {
            status: 'modified',
            elementId: oldId,
            elementType: newElData.type, // Use new type in case it changed
            changes: Object.keys(changes).length > 0 ? changes : undefined,
            oldValue: oldElData,
            newValue: newElData,
            moved: moved ? { fromIndex: oldIndex, toIndex: newIndex } : undefined,
          };
          diffs.push(diff);
        } else {
          // No changes detected
          diffs.push({
            status: 'unchanged',
            elementId: oldId,
            elementType: oldElData.type,
          });
        }
      } else {
        // Element removed
        diffs.push({
          status: 'removed',
          elementId: oldId,
          elementType: oldElData.type,
          oldValue: oldElData,
        });
      }
    });

    // 2. Check for added elements
    newElements.forEach((newElData, newIndex) => {
      if (!handledNewIds.has(newElData.id)) {
        // This ID was not in the old list
        diffs.push({
          status: 'added',
          elementId: newElData.id,
          elementType: newElData.type,
          newValue: newElData,
        });
      }
    });

    return diffs;
  }

  /**
   * Compares two objects (e.g., styles, properties) and returns detailed changes.
   * Handles nested objects up to one level deep (e.g., layout.padding).
   * @param oldObj The old object.
   * @param newObj The new object.
   * @returns A record detailing property changes (potentially nested), or null if no changes.
   */
  private diffProperties(
      oldObj: Record<string, any> | undefined | null, 
      newObj: Record<string, any> | undefined | null
  ): Record<string, PropertyChange | Record<string, PropertyChange>> | null {
    oldObj = oldObj || {};
    newObj = newObj || {};

    if (this._.isEqual(oldObj, newObj)) {
        return null;
    }

    // Type for the changes object, allowing nested records
    const changes: Record<string, PropertyChange | Record<string, PropertyChange>> = {}; 
    const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

    allKeys.forEach(key => {
        const oldValue = oldObj![key];
        const newValue = newObj![key];

        if (!this._.isEqual(oldValue, newValue)) {
             // Check if the property itself is an object (like padding, margin, button props)
             // Basic check: only recurse one level deep for simplicity here
             if (
                typeof oldValue === 'object' && oldValue !== null && !Array.isArray(oldValue) &&
                typeof newValue === 'object' && newValue !== null && !Array.isArray(newValue)
                // Add a depth check here if full recursion was needed
             ) {
                 // Compare the nested objects directly - no further recursion in this implementation
                 const nestedChanges: Record<string, PropertyChange> = {};
                 const nestedKeys = new Set([...Object.keys(oldValue), ...Object.keys(newValue)]);
                 let hasNestedChange = false;
                 nestedKeys.forEach(nestedKey => {
                     if (!this._.isEqual(oldValue[nestedKey], newValue[nestedKey])) {
                         nestedChanges[nestedKey] = { oldValue: oldValue[nestedKey], newValue: newValue[nestedKey] };
                         hasNestedChange = true;
                     }
                 });

                 if (hasNestedChange) {
                     // Assign the record of nested changes correctly
                     changes[key] = nestedChanges; 
                 }
             } else {
                 // Assign simple property change
                 changes[key] = { oldValue, newValue };
             }
        }
    });

    return Object.keys(changes).length > 0 ? changes : null;
  }
} 