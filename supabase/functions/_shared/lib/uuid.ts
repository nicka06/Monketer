
// Use uuid package to get server-compatible uuid generation
import { v4 as uuidv4 } from 'uuid';

export const generateId = () => uuidv4();
