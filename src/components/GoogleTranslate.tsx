import { useEffect } from 'react';

interface GoogleTranslateElement {
  TranslateElement: {
    new (
      options: { pageLanguage: string; layout?: any; autoDisplay?: boolean; includedLanguages?: string },
      elementId: string
    ): void;
    InlineLayout: {
      SIMPLE: any;
      HORIZONTAL: any;
      VERTICAL: any;
    };
  };
}

interface GoogleTranslate {
  translate: GoogleTranslateElement;
}

declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
    google?: {
      translate?: GoogleTranslateElement;
    };
  }
}

interface GoogleTranslateProps {
  containerId?: string;
}

export function GoogleTranslate({ 
  containerId = "google_translate_element" 
}: GoogleTranslateProps) {
  useEffect(() => {
    // Helper to initialize this specific instance
    const initWidget = () => {
      // Check if google translate API is loaded
      if (window.google?.translate?.TranslateElement) {
        const element = document.getElementById(containerId);
        // Only initialize if element exists and doesn't already have the gadget
        if (element && !element.querySelector('.goog-te-gadget')) {
          new window.google.translate.TranslateElement(
            { 
              pageLanguage: 'en', 
              layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
              autoDisplay: false
            }, 
            containerId
          );
        }
      }
    };

    // If script is already loaded and ready, init immediately
    if (window.google?.translate?.TranslateElement) {
      initWidget();
    }

    // Listen for the ready event (fired when script loads)
    const handleReady = () => initWidget();
    window.addEventListener('google-translate-ready', handleReady);
    
    return () => {
      window.removeEventListener('google-translate-ready', handleReady);
    };
  }, [containerId]);

  return (
    <div className="relative group z-50">
      <div 
        id={containerId} 
        className="google-translate-container min-h-[40px] flex items-center" 
      />
      
      <style>{`
        /* Hide the specific google branding elements we don't want */
        .goog-te-banner-frame { display: none !important; }
        .goog-logo-link { display: none !important; }
        body { top: 0px !important; }
        
        /* The container for the dropdown */
        .goog-te-gadget {
          font-family: inherit !important;
          font-size: 0 !important; /* Hide 'Powered by Google' text */
          color: transparent !important;
        }
        
        /* The Actual Dropdown (Select Element) */
        .goog-te-combo {
          color: hsl(var(--foreground)) !important;
          background-color: hsl(var(--background)) !important;
          border: 1px solid hsl(var(--border)) !important;
          border-radius: 6px !important;
          padding: 6px 8px !important;
          font-size: 14px !important; /* Restore font size for dropdown */
          font-weight: 500 !important;
          line-height: 1.5 !important;
          height: 36px !important;
          min-width: 120px !important;
          margin: 0 !important;
          cursor: pointer !important;
          outline: none !important;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05) !important;
          display: block !important;
          opacity: 1 !important;
          visibility: visible !important;
        }

        /* Hide all other Google clutter */
        .goog-te-gadget span {
          display: none !important;
        }
        
        .goog-te-gadget-simple {
          background-color: transparent !important;
          border: none !important;
          padding: 0 !important;
          font-size: 10pt !important;
          display: inline-block !important;
          padding-top: 0 !important;
          padding-bottom: 0 !important;
          cursor: pointer !important;
        }
      `}</style>
    </div>
  );
}
