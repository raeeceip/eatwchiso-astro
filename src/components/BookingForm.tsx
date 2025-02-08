import { useState, useEffect, useRef } from 'react';
import styles from './BookingForm.module.css';

interface BookingFormData {
  name: string;
  email: string;
  date: string;
  time: string;
  partySize: string;
  preferences: {
    pancakeType: string;
    eggStyle: string;
    sides: string[];
    meat: string;
    additions: string[];
  };
}

interface TerminalResponse {
  timestamp: string;
  type: 'info' | 'error' | 'success' | 'system' | 'input' | 'prompt';
  message: string;
}

const MENU_OPTIONS = {
  pancakeTypes: ['Buttermilk', 'Chocolate Chip', 'Blueberry', 'Banana'],
  eggStyles: ['Scrambled', 'Over Easy', 'Sunny Side Up', 'Poached'],
  sides: ['Hash Browns', 'Toast', 'Fruit Bowl', 'Grits'],
  meats: ['Bacon', 'Sausage', 'Ham', 'None'],
  additions: ['Extra Syrup', 'Whipped Cream', 'Nuts', 'Chocolate Sauce']
};

const WORKER_URL = 'https://eatwchiso-bookings.chiboguchisomu.workers.dev';

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

export const BookingForm = () => {
  const [formData, setFormData] = useState<BookingFormData>({
    name: '',
    email: '',
    date: '',
    time: '',
    partySize: '',
    preferences: {
      pancakeType: '',
      eggStyle: '',
      sides: [],
      meat: '',
      additions: []
    }
  });
  const [responses, setResponses] = useState<TerminalResponse[]>([]);
  const [currentInput, setCurrentInput] = useState<keyof BookingFormData | keyof BookingFormData['preferences']>('name');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize terminal
    const timestamp = new Date().toLocaleTimeString();
    setResponses([
      { timestamp, type: 'system', message: 'Initializing booking system...' },
      { timestamp, type: 'system', message: `Connected to booking service at ${WORKER_URL}` },
      { timestamp, type: 'system', message: 'Ready to process your booking request.' },
      { timestamp, type: 'prompt', message: 'Please enter your name:' }
    ]);
  }, []);

  useEffect(() => {
    // Scroll to bottom when new responses are added
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
    // Focus input when current input changes
    inputRef.current?.focus();
  }, [responses, currentInput]);

  const addResponse = (type: TerminalResponse['type'], message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setResponses(prev => [...prev, { timestamp, type, message }]);
  };

  const handleInputSubmit = (value: string) => {
    addResponse('input', `$ ${value}`);

    switch (currentInput) {
      case 'name':
        if (!value.trim()) {
          addResponse('error', 'Name cannot be empty');
          addResponse('prompt', 'Please enter your name:');
          return;
        }
        setFormData(prev => ({ ...prev, name: value }));
        setCurrentInput('email');
        addResponse('prompt', 'Please enter your email:');
        break;

      case 'email':
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          addResponse('error', 'Invalid email format');
          addResponse('prompt', 'Please enter your email:');
          return;
        }
        setFormData(prev => ({ ...prev, email: value }));
        setCurrentInput('date');
        addResponse('prompt', 'Enter booking date (YYYY-MM-DD):');
        break;

      case 'date':
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
          addResponse('error', 'Invalid date format. Use YYYY-MM-DD');
          addResponse('prompt', 'Enter booking date (YYYY-MM-DD):');
          return;
        }
        setFormData(prev => ({ ...prev, date: value }));
        setCurrentInput('time');
        addResponse('prompt', 'Enter booking time (HH:MM):');
        break;

      case 'time':
        if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value)) {
          addResponse('error', 'Invalid time format. Use HH:MM');
          addResponse('prompt', 'Enter booking time (HH:MM):');
          return;
        }
        setFormData(prev => ({ ...prev, time: value }));
        setCurrentInput('partySize');
        addResponse('prompt', 'Enter number of guests:');
        break;

      case 'partySize':
        if (isNaN(Number(value)) || Number(value) < 1) {
          addResponse('error', 'Party size must be at least 1');
          addResponse('prompt', 'Enter number of guests:');
          return;
        }
        setFormData(prev => ({ ...prev, partySize: value }));
        setCurrentInput('pancakeType');
        addResponse('info', '\nAvailable pancake types:');
        MENU_OPTIONS.pancakeTypes.forEach((type, i) => 
          addResponse('info', `${i + 1}. ${type}`)
        );
        addResponse('prompt', 'Select pancake type (enter number):');
        break;

      case 'pancakeType':
        const pancakeIndex = Number(value) - 1;
        if (isNaN(pancakeIndex) || pancakeIndex < 0 || pancakeIndex >= MENU_OPTIONS.pancakeTypes.length) {
          addResponse('error', 'Invalid selection');
          addResponse('prompt', 'Select pancake type (enter number):');
          return;
        }
        setFormData(prev => ({
          ...prev,
          preferences: {
            ...prev.preferences,
            pancakeType: MENU_OPTIONS.pancakeTypes[pancakeIndex]
          }
        }));
        handleSubmit();
        break;
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isSubmitting) {
      const input = e.currentTarget as HTMLInputElement;
      handleInputSubmit(input.value);
      input.value = '';
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    addResponse('info', 'Initializing booking request...');
    addResponse('info', `Connecting to worker at ${WORKER_URL}...`);

    try {
      addResponse('info', 'Sending booking request to worker...');
      const response = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const result = await response.json();
      addResponse('info', 'Response received from worker');

      if (!response.ok) {
        throw new Error(result.error || 'Booking failed');
      }

      if (result.success) {
        localStorage.setItem('guestName', formData.name);
        addResponse('success', 'Booking confirmed!');
        addResponse('success', `
Booking Details:
---------------
> Date: ${formatDate(formData.date)}
> Time: ${formData.time}
> Guests: ${formData.partySize}
> Menu:
  - Pancakes: ${formData.preferences.pancakeType}
  - Eggs: ${formData.preferences.eggStyle || ''}
  - Sides: ${formData.preferences.sides.join(', ')}
  - Meat: ${formData.preferences.meat || ''}
  - Additions: ${formData.preferences.additions.join(', ')}

Confirmation ID: ${result.data?.confirmationId || 'Pending...'}
`);
        // Reset form
        setFormData({
          name: '',
          email: '',
          date: '',
          time: '',
          partySize: '',
          preferences: {
            pancakeType: '',
            eggStyle: '',
            sides: [],
            meat: '',
            additions: []
          }
        });
        setCurrentInput('name');
        addResponse('prompt', '\nWould you like to make another booking? (Enter name or press Ctrl+C to exit):');
      }
    } catch (err) {
      addResponse('error', err instanceof Error ? err.message : 'Booking failed');
      addResponse('error', 'Please try again or contact support if the issue persists.');
      setCurrentInput('name');
      addResponse('prompt', 'Please enter your name:');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.terminal}>
      <div className={styles.terminalHeader}>
        <span>Eat with Chiso Terminal Booking System v1.0.0</span>
      </div>
      
      <div className={styles.terminalBody} ref={terminalRef}>
        <div className={styles.terminalPrompt}>
          <span className={styles.promptUser}>{formData.name || 'guest'}</span>
          <span className={styles.promptAt}>@</span>
          <span className={styles.promptHost}>eatwchiso</span>
          <span className={styles.promptColon}>:~$</span>
          <span className={styles.promptCommand}> ./book-breakfast.sh</span>
        </div>

        <div className={styles.responses}>
          {responses.map((response, index) => (
            <pre key={index} className={`${styles.response} ${styles[response.type]}`}>
              {response.type !== 'prompt' && `${response.timestamp} [${response.type.toUpperCase()}] `}{response.message}
            </pre>
          ))}
        </div>

        <div className={styles.inputLine}>
          <span className={styles.promptSymbol}>$</span>
          <input
            ref={inputRef}
            type="text"
            className={styles.terminalInput}
            onKeyPress={handleKeyPress}
            disabled={isSubmitting}
            autoFocus
          />
        </div>
      </div>
    </div>
  );
};
