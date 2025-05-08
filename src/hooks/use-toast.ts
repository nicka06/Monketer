import * as React from "react"

import type {
  ToastActionElement,
  ToastProps,
} from "@/components/ui/toast"

/**
 * Maximum number of toasts displayed simultaneously
 * Limits visual clutter in the UI
 */
const TOAST_LIMIT = 1

/**
 * Delay in milliseconds before removing a dismissed toast from the DOM
 * Allows time for exit animations to complete
 */
const TOAST_REMOVE_DELAY = 1000000

/**
 * Toast notification object type
 * Extends the base toast props with additional properties
 * for internal state management
 */
type ToasterToast = ToastProps & {
  id: string                    // Unique identifier
  title?: React.ReactNode       // Optional toast title
  description?: React.ReactNode // Optional toast content
  action?: ToastActionElement   // Optional action button/element
}

/**
 * Action types for the toast reducer
 * Controls the different operations available for toast management
 */
const actionTypes = {
  ADD_TOAST: "ADD_TOAST",         // Add a new toast
  UPDATE_TOAST: "UPDATE_TOAST",   // Update an existing toast
  DISMISS_TOAST: "DISMISS_TOAST", // Mark a toast for dismissal
  REMOVE_TOAST: "REMOVE_TOAST",   // Remove a toast from the DOM
} as const

/**
 * Counter for generating unique toast IDs
 * Uses a simple incremental pattern with wraparound
 */
let count = 0

/**
 * Generates a unique ID for each toast
 * @returns A unique string ID
 */
function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

type ActionType = typeof actionTypes

/**
 * Union type for all possible reducer actions
 * Each action contains the necessary data to process the operation
 */
type Action =
  | {
      type: ActionType["ADD_TOAST"]
      toast: ToasterToast
    }
  | {
      type: ActionType["UPDATE_TOAST"]
      toast: Partial<ToasterToast>
    }
  | {
      type: ActionType["DISMISS_TOAST"]
      toastId?: ToasterToast["id"]
    }
  | {
      type: ActionType["REMOVE_TOAST"]
      toastId?: ToasterToast["id"]
    }

/**
 * State interface for toast management
 * Maintains an array of active toast notifications
 */
interface State {
  toasts: ToasterToast[]
}

/**
 * Map of timeout IDs for pending toast removals
 * Tracks timeouts to prevent duplicate removal operations
 */
const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

/**
 * Schedules a toast for removal after animation completes
 * @param toastId - ID of the toast to be removed
 */
const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) {
    return
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId)
    dispatch({
      type: "REMOVE_TOAST",
      toastId: toastId,
    })
  }, TOAST_REMOVE_DELAY)

  toastTimeouts.set(toastId, timeout)
}

/**
 * Reducer function for toast state management
 * Handles all toast operations (add, update, dismiss, remove)
 * 
 * @param state - Current toast state
 * @param action - Action to perform
 * @returns Updated toast state
 */
export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }

    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }

    case "DISMISS_TOAST": {
      const { toastId } = action

      // ! Side effects ! - This could be extracted into a dismissToast() action,
      // but I'll keep it here for simplicity
      if (toastId) {
        addToRemoveQueue(toastId)
      } else {
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id)
        })
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t
        ),
      }
    }
    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        }
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }
  }
}

/**
 * Array of state listeners for toast updates
 * Implements a simplified pub/sub pattern
 */
const listeners: Array<(state: State) => void> = []

/**
 * Single source of truth for toast state
 * Persists across component renders and re-mounts
 */
let memoryState: State = { toasts: [] }

/**
 * Dispatches an action to update toast state
 * Updates global memory state and notifies all listeners
 * 
 * @param action - Action to dispatch
 */
function dispatch(action: Action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => {
    listener(memoryState)
  })
}

/**
 * Type for creating a new toast
 * Omits the ID as it's generated internally
 */
type Toast = Omit<ToasterToast, "id">

/**
 * Creates and displays a toast notification
 * 
 * @param props - Toast properties (variant, title, description, etc.)
 * @returns Object with methods to control the created toast
 * 
 * @example
 * // Create a simple toast
 * toast({
 *   title: "Success",
 *   description: "Your changes have been saved.",
 *   variant: "success",
 * })
 * 
 * @example
 * // Create a toast with an action button
 * const { dismiss } = toast({
 *   title: "Undo Available",
 *   description: "Item deleted",
 *   action: <ToastAction altText="Undo" onClick={handleUndo}>Undo</ToastAction>,
 * })
 * 
 * // Dismiss programmatically later
 * setTimeout(dismiss, 3000)
 */
function toast({ ...props }: Toast) {
  const id = genId()

  const update = (props: ToasterToast) =>
    dispatch({
      type: "UPDATE_TOAST",
      toast: { ...props, id },
    })
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id })

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss()
      },
    },
  })

  return {
    id: id,
    dismiss,
    update,
  }
}

/**
 * React hook for accessing and managing toast notifications
 * 
 * Provides access to:
 * - Current toast state
 * - Methods to create toasts
 * - Methods to dismiss toasts
 * 
 * @returns Toast state and control methods
 * 
 * @example
 * function MyComponent() {
 *   const { toast } = useToast()
 *   
 *   const handleClick = () => {
 *     toast({
 *       title: "Success",
 *       description: "Operation completed successfully",
 *       variant: "success",
 *     })
 *   }
 *   
 *   return <Button onClick={handleClick}>Show Toast</Button>
 * }
 */
function useToast() {
  const [state, setState] = React.useState<State>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [state])

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
  }
}

export { useToast, toast }
