import { useEffect, useRef, useState } from 'react';
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

interface Response {
  type: 'info' | 'error' | 'success' | 'system' | 'input' | 'prompt' | 'menu';
  message: string;
  timestamp: string;
}

interface Props {
  initialPath?: string;
}

export const BookingForm = ({ initialPath = "/" }: Props) => {
  const [responses, setResponses] = useState<Response[]>([]);
  const [currentInput, setCurrentInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [currentStep, setCurrentStep] = useState(0);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [bookingData, setBookingData] = useState<BookingFormData>({
    name: "",
    email: "",
    date: "",
    time: "",
    partySize: "",
    preferences: {
      pancakeType: "",
      eggStyle: "",
      sides: [],
      meat: "",
      additions: []
    }
  });

  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [responses]);

  useEffect(() => {
    // Fetch and display menu on page load
    fetchMenu();
  }, [currentPath]);

  const formatMenu = (menu: any) => {
    let formattedMenu = `🍽️  Today's ${currentPath.slice(1)} Menu:\n\n`;
    
    Object.entries(menu).forEach(([category, items]: [string, any]) => {
      formattedMenu += `${category}\n`;
      items.forEach((item: any) => {
        formattedMenu += `  • ${item.name} - $${item.price}\n`;
        if (item.description) {
          formattedMenu += `    ${item.description}\n`;
        }
      });
      formattedMenu += '\n';
    });
    
    return formattedMenu;
  };

  const fetchMenu = async () => {
    try {
      const mealType = currentPath.replace('/', '') || 'breakfast';
      const response = await fetch(`/api/menu?type=${mealType}`);
      if (!response.ok) {
        throw new Error('Failed to fetch menu');
      }
      const data = await response.json();

      // Clear any previous menu responses
      setResponses(prev => prev.filter(r => !r.message.includes("Today's")));
      
      addResponse('system', formatMenu(data));
    } catch (error) {
      console.error('Menu fetch error:', error);
      addResponse('error', 'Failed to fetch menu. Please try again.');
    }
  };

  const steps = [
    {
      prompt: "Please enter your name:",
      field: "name",
      validation: "name",
      error: "Name must be at least 2 characters long"
    },
    {
      prompt: "Please enter your email:",
      field: "email",
      validation: "email",
      error: "Please enter a valid email address"
    },
    {
      prompt: "Enter the date (YYYY-MM-DD):",
      field: "date",
      validation: "date",
      error: "Please enter a valid date (YYYY-MM-DD)"
    },
    {
      prompt: "Enter the time (HH:MM):",
      field: "time",
      validation: "time",
      error: "Please enter a valid time (HH:MM)"
    },
    {
      prompt: "Enter party size:",
      field: "partySize",
      validation: "partySize",
      error: "Please enter a valid party size (1 or more)"
    },
    {
      prompt: "Select pancake type (enter the number):\n1. Classic Buttermilk ($12.99)\n2. Chocolate Chip ($14.99)\n3. Blueberry ($14.99)",
      field: "preferences.pancakeType",
      validation: "pancakeType",
      error: "Please select a valid option (1-3)",
      options: {
        "1": "buttermilk",
        "2": "chocolate",
        "3": "blueberry"
      }
    },
    {
      prompt: "How would you like your eggs? (enter the number):\n1. Scrambled\n2. Sunny-side-up\n3. Over-easy\n4. No eggs",
      field: "preferences.eggStyle",
      validation: "eggStyle",
      error: "Please select a valid option (1-4)",
      options: {
        "1": "scrambled",
        "2": "sunny-side-up",
        "3": "over-easy",
        "4": "none"
      }
    },
    {
      prompt: "Select meat (enter the number):\n1. Bacon ($4.99)\n2. Sausage ($4.99)\n3. Ham ($4.99)\n4. No meat",
      field: "preferences.meat",
      validation: "meat",
      error: "Please select a valid option (1-4)",
      options: {
        "1": "bacon",
        "2": "sausage",
        "3": "ham",
        "4": "none"
      }
    },
    {
      prompt: "Would you like to confirm your order? (yes/no):",
      field: "confirmation",
      validation: "confirmation",
      error: "Please enter yes or no"
    }
  ];

  const commands = {
    help: () => {
      addResponse('info', `
Available commands:
  cd [dir]     - Change directory (breakfast/lunch/dinner)
  ls, dir      - List available directories
  pwd          - Print working directory
  clear        - Clear the terminal
  menu         - Show today's menu
  history      - Show command history
  help         - Show this help message
  book         - Start booking process`);
    },
    menu: () => fetchMenu(),
    history: () => {
      addResponse('info', '\nCommand history:');
      commandHistory.forEach((cmd, i) => {
        addResponse('system', `${i + 1}  ${cmd}`);
      });
    }
  };

  const validateInput = (value: string, validation: string): boolean => {
    switch (validation) {
      case "name":
        return value.length >= 2;
      case "email":
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      case "date":
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(value)) return false;
        const date = new Date(value);
        return date instanceof Date && !isNaN(date.getTime()) && date >= new Date();
      case "time":
        return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value);
      case "partySize":
        const size = parseInt(value);
        return !isNaN(size) && size > 0 && size <= 10;
      case "pancakeType":
        return ["1", "2", "3"].includes(value);
      case "eggStyle":
        return ["1", "2", "3", "4"].includes(value);
      case "meat":
        return ["1", "2", "3", "4"].includes(value);
      case "confirmation":
        return ["yes", "no"].includes(value.toLowerCase());
      default:
        return true;
    }
  };

  const addResponse = (type: Response['type'], message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setResponses(prev => [...prev, { type, message, timestamp }]);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    addResponse('system', 'Processing your booking...');

    try {
      const response = await fetch('/api/book', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process booking');
      }

      addResponse('success', `
Booking confirmed! ${data.emailSent ? '' : 'However, we couldn\'t send the confirmation email: ' + data.emailError}

Booking Details:
Date: ${new Date(bookingData.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
Time: ${bookingData.time}
Party Size: ${bookingData.partySize}

Menu Selections:
- Pancakes: ${bookingData.preferences.pancakeType}
${bookingData.preferences.eggStyle !== 'none' ? `- Eggs: ${bookingData.preferences.eggStyle}` : ''}
${bookingData.preferences.meat !== 'none' ? `- Meat: ${bookingData.preferences.meat}` : ''}

Confirmation ID: ${data.confirmationId}
Please save this confirmation ID for your records.`);

      // Reset form
      setBookingData({
        name: '',
        email: '',
        date: '',
        time: '',
        partySize: '',
        preferences: {
          pancakeType: '',
          eggStyle: '',
          meat: '',
          sides: [],
          additions: []
        }
      });

      // Ask if they want to make another booking
      setCurrentStep(steps.length + 1);
      addResponse('prompt', 'Would you like to make another booking? (yes/no):');

    } catch (error: any) {
      addResponse('error', `Failed to process booking: ${error.message}`);
      addResponse('prompt', 'Would you like to try again? (yes/no):');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCommand = (command: string) => {
    const normalizedCommand = command.trim().toLowerCase();

    // Add to command history
    setCommandHistory(prev => [...prev, command]);
    setHistoryIndex(-1);

    // Handle built-in commands
    if (commands[normalizedCommand as keyof typeof commands]) {
      commands[normalizedCommand as keyof typeof commands]();
      return true;
    }

    // Handle navigation commands
    if (normalizedCommand === "cd ..") {
      setCurrentPath("/");
      addResponse("system", "Available directories:");
      addResponse("info", "breakfast/");
      addResponse("info", "lunch/");
      addResponse("info", "dinner/");
      return true;
    }

    if (normalizedCommand.startsWith("cd ")) {
      const target = normalizedCommand.slice(3).trim();
      switch (target) {
        case "breakfast":
          window.location.href = "/";
          return true;
        case "lunch":
          window.location.href = "/lunch";
          return true;
        case "dinner":
          window.location.href = "/dinner";
          return true;
        default:
          addResponse("error", `Directory not found: ${target}`);
          return true;
      }
    }

    if (normalizedCommand === "ls" || normalizedCommand === "dir") {
      if (currentPath === "/") {
        addResponse("info", "breakfast/");
        addResponse("info", "lunch/");
        addResponse("info", "dinner/");
      } else {
        addResponse("info", "No subdirectories available in current path");
      }
      return true;
    }

    if (normalizedCommand === "clear") {
      setResponses([]);
      return true;
    }

    if (normalizedCommand === "pwd") {
      addResponse("info", currentPath || "/");
      return true;
    }

    if (normalizedCommand === "book") {
      setCurrentStep(1);
      addResponse('system', '📝 Starting booking process...');
      addResponse('prompt', steps[0].prompt);
      return true;
    }

    return false;
  };

  const availableCommands = [
    'help',
    'cd',
    'ls',
    'dir',
    'pwd',
    'clear',
    'menu',
    'history',
    'book'
  ];

  const availablePaths = [
    'breakfast',
    'lunch',
    'dinner'
  ];

  const handleTabCompletion = () => {
    const input = currentInput.trim();
    
    // Don't show suggestions during booking process
    if (currentStep > 0) return;

    if (!input) {
      setSuggestions(availableCommands);
      return;
    }

    // Handle cd command completion
    if (input === 'cd ' || input.startsWith('cd ')) {
      const pathInput = input.slice(3);
      const matchingPaths = availablePaths.filter(path => 
        path.startsWith(pathInput) && path !== pathInput
      );
      
      if (matchingPaths.length === 1) {
        setCurrentInput(`cd ${matchingPaths[0]}`);
        setSuggestions([]);
      } else if (matchingPaths.length > 0) {
        setSuggestions(matchingPaths.map(path => `cd ${path}`));
      }
      return;
    }

    // Handle command completion
    const matchingCommands = availableCommands.filter(cmd => 
      cmd.startsWith(input) && cmd !== input
    );

    if (matchingCommands.length === 1) {
      setCurrentInput(matchingCommands[0]);
      setSuggestions([]);
    } else if (matchingCommands.length > 0) {
      setSuggestions(matchingCommands);
    } else {
      setSuggestions([]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isSubmitting) {
      handleInput(currentInput);
      setSuggestions([]);
    } else if (e.key === "Tab") {
      e.preventDefault();
      handleTabCompletion();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (historyIndex < commandHistory.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setCurrentInput(commandHistory[commandHistory.length - 1 - newIndex]);
        setSuggestions([]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setCurrentInput(commandHistory[commandHistory.length - 1 - newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCurrentInput("");
      }
      setSuggestions([]);
    } else if (e.key === "Escape") {
      setSuggestions([]);
    }
  };

  const handleInput = async (input: string) => {
    const trimmedInput = input.trim().toLowerCase();
    
    // Don't add empty commands to history
    if (trimmedInput && currentStep === 0) {
      setCommandHistory([...commandHistory, trimmedInput]);
      setHistoryIndex(-1);
    }
    
    setCurrentInput("");

    // During booking process
    if (currentStep > 0) {
      handleBookingStep(trimmedInput);
      return;
    }

    // Handle commands
    switch (trimmedInput) {
      case "help":
        addResponse('system', `
Available commands:
  cd [dir]     - Change directory (breakfast/lunch/dinner)
  ls, dir      - List available directories
  pwd          - Print working directory
  clear        - Clear the terminal
  menu         - Show today's menu
  history      - Show command history
  help         - Show this help message
  book         - Start booking process`);
        break;

      case "clear":
        setResponses([]);
        break;

      case "menu":
        await fetchMenu();
        break;

      case "pwd":
        addResponse('system', currentPath);
        break;

      case "ls":
      case "dir":
        addResponse('system', 'Available directories:\n  breakfast/\n  lunch/\n  dinner/');
        break;

      case "history":
        if (commandHistory.length === 0) {
          addResponse('system', 'No command history');
        } else {
          addResponse('system', commandHistory.map((cmd, i) => 
            `${(commandHistory.length - i).toString().padStart(4)} ${cmd}`
          ).join('\n'));
        }
        break;

      case "book":
        startBooking();
        break;

      default:
        if (trimmedInput.startsWith("cd ")) {
          const newPath = trimmedInput.slice(3).trim();
          if (newPath === "..") {
            setCurrentPath("/");
            await fetchMenu();
          } else if (["breakfast", "lunch", "dinner"].includes(newPath)) {
            setCurrentPath(`/${newPath}`);
            await fetchMenu();
          } else {
            addResponse('error', `Directory not found: ${newPath}`);
          }
        } else if (trimmedInput !== "") {
          addResponse('error', `Command not found: ${trimmedInput}`);
        }
        break;
    }
  };

  const startBooking = () => {
    setCurrentStep(1);
    addResponse('system', '📝 Starting booking process...');
    addResponse('prompt', steps[0].prompt);
  };

  const handleBookingStep = (input: string) => {
    const value = input.trim();
    addResponse('input', value);

    if (!value) {
      addResponse('error', 'Please provide a valid input');
      addResponse('prompt', steps[currentStep - 1].prompt);
      return;
    }

    // Validate current step
    const currentStepData = steps[currentStep - 1];
    if (!validateInput(value, currentStepData.validation)) {
      addResponse('error', currentStepData.error);
      addResponse('prompt', currentStepData.prompt);
      return;
    }

    // Convert numbered options to actual values
    let processedValue = value;
    if (currentStepData.options && currentStepData.options[value]) {
      processedValue = currentStepData.options[value];
    }

    // Store the value
    if (currentStepData.field.includes('.')) {
      const [parent, child] = currentStepData.field.split('.');
      setBookingData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: processedValue
        }
      }));
    } else {
      setBookingData(prev => ({ ...prev, [currentStepData.field]: processedValue }));
    }

    // Handle confirmation
    if (currentStep === steps.length && value.toLowerCase() === 'yes') {
      handleSubmit();
      return;
    }

    // Move to next step
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
      if (currentStep < steps.length) {
        addResponse('prompt', steps[currentStep].prompt);
      }
    }
  };

  useEffect(() => {
    addResponse('system', '🍽️  Welcome to EatWithChiso Terminal!');
    addResponse('system', 'Type \'help\' for available commands.');
    fetchMenu();
  }, []);

  return (
    <div className={styles.terminal}>
      <div className={styles.terminalHeader}>
        Terminal - {currentPath === "/" ? "Home" : currentPath.slice(1).charAt(0).toUpperCase() + currentPath.slice(2)}
      </div>
      <div className={styles.terminalBody} ref={terminalRef}>
        <div className={styles.responses}>
          {responses.map((response, index) => (
            <div key={index} className={`${styles.response} ${styles[response.type]}`}>
              {response.message}
            </div>
          ))}
        </div>
        <div className={styles.inputContainer}>
          <div className={styles.inputLine}>
            <div className={styles.inputPrompt}>
              <span className={styles.promptUser}>chiso</span>
              <span>@</span>
              <span className={styles.inputPromptPath}>terminal</span>
              <span className={styles.promptArrow}>➜</span>
              <span className={styles.promptPath}>{currentPath}</span>
            </div>
            <input
              type="text"
              className={styles.terminalInput}
              value={currentInput}
              onChange={(e) => {
                setCurrentInput(e.target.value);
                if (e.target.value.length > 0) {
                  handleTabCompletion();
                } else {
                  setSuggestions([]);
                }
              }}
              onKeyDown={handleKeyDown}
              disabled={isSubmitting}
              autoFocus
            />
          </div>
          {suggestions.length > 0 && (
            <div className={styles.suggestions}>
              {suggestions.map((suggestion, index) => (
                <span
                  key={index}
                  className={styles.suggestion}
                  onClick={() => {
                    setCurrentInput(suggestion);
                    setSuggestions([]);
                  }}
                >
                  {suggestion}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
