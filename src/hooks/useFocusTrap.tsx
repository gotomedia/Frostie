import { useRef, useEffect } from 'react';

export const useFocusTrap = (isActive: boolean) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive || !ref.current) return;

    const focusableElements = ref.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements.length === 0) return;
    
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };

    // Handle Escape key to close modal if needed
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // The component using this hook should handle closing via props
        document.dispatchEvent(new CustomEvent('closeFocusTrap'));
      }
    };

    document.addEventListener('keydown', handleTabKey);
    document.addEventListener('keydown', handleEscapeKey);
    
    // Save active element to restore focus later
    const previouslyFocused = document.activeElement as HTMLElement;
    
    // Focus the first element
    firstElement.focus();

    return () => {
      document.removeEventListener('keydown', handleTabKey);
      document.removeEventListener('keydown', handleEscapeKey);
      
      // Restore focus when trap is deactivated
      if (previouslyFocused) {
        previouslyFocused.focus();
      }
    };
  }, [isActive]);

  return ref;
};

export default useFocusTrap;