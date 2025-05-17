import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

interface DatepickerProps {
  id: string;
  label: string;
  selectedDate: Date;
  onChange: (date: Date) => void;
  maxDate?: Date;
  minDate?: Date;
}

const AccessibleDatepicker: React.FC<DatepickerProps> = ({
  id,
  label,
  selectedDate,
  onChange,
  maxDate,
  minDate
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date(selectedDate));
  const [focusedDate, setFocusedDate] = useState<Date>(new Date(selectedDate));
  const [inputValue, setInputValue] = useState(formatDateForDisplay(selectedDate));
  
  const calendarRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastMessage = useRef<string>('');

  // Month and day names
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June', 
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const dayLabels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayAbbr = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  
  // Format date for display (MM/DD/YYYY)
  function formatDateForDisplay(date: Date): string {
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
  }
  
  // Generate button label for aria-label
  function getButtonLabel(date: Date): string {
    return `Change Date, ${dayLabels[date.getDay()]}, ${monthNames[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  }

  // Parse date from MM/DD/YYYY string
  function parseDateFromString(dateString: string): Date | null {
    const parts = dateString.split('/');
    if (parts.length !== 3) return null;
    
    const month = parseInt(parts[0], 10) - 1;
    const day = parseInt(parts[1], 10);
    let year = parseInt(parts[2], 10);
    
    if (isNaN(month) || isNaN(day) || isNaN(year)) return null;
    
    // Handle 2-digit years
    if (year < 100) year += 2000;
    
    const date = new Date(year, month, day);
    if (isNaN(date.getTime())) return null;
    
    return date;
  }
  
  // Check if date is in range
  function isDateInRange(date: Date): boolean {
    if (minDate && date < minDate) return false;
    if (maxDate && date > maxDate) return false;
    return true;
  }
  
  // Check if date is same as another date
  function isSameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && 
           a.getMonth() === b.getMonth() && 
           a.getDate() === b.getDate();
  }
  
  // Check if date is in a different month
  function isOtherMonth(a: Date, b: Date): boolean {
    return a.getFullYear() !== b.getFullYear() || a.getMonth() !== b.getMonth();
  }
  
  // Set message for screen readers (with delay to prevent flickering)
  function setMessage(message: string) {
    if (message === lastMessage.current) return;
    
    const messageNode = document.getElementById(`${id}-dialog-message`);
    if (messageNode) {
      setTimeout(() => {
        messageNode.textContent = message;
      }, 200);
    }
    
    lastMessage.current = message;
  }

  // Generate grid of dates for calendar
  function generateCalendarDays() {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    // First day of month in the week (0 = Sunday, 1 = Monday, etc)
    const firstDay = new Date(year, month, 1).getDay();
    
    // Days in month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Days from previous month to show
    const prevMonthDays = [];
    const prevMonth = new Date(year, month, 0);
    const daysInPrevMonth = prevMonth.getDate();
    
    for (let i = firstDay - 1; i >= 0; i--) {
      prevMonthDays.push(new Date(year, month - 1, daysInPrevMonth - i));
    }
    
    // Days from current month
    const currentMonthDays = [];
    for (let i = 1; i <= daysInMonth; i++) {
      currentMonthDays.push(new Date(year, month, i));
    }
    
    // Days from next month to fill out the last row
    const nextMonthDays = [];
    const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
    const remainingCells = totalCells - (prevMonthDays.length + currentMonthDays.length);
    
    for (let i = 1; i <= remainingCells; i++) {
      nextMonthDays.push(new Date(year, month + 1, i));
    }
    
    return { prevMonthDays, currentMonthDays, nextMonthDays };
  }
  
  // Open the calendar
  function handleOpenCalendar() {
    // Parse the date from input if it's a valid format
    const date = parseDateFromString(inputValue);
    if (date && isDateInRange(date)) {
      setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1));
      setFocusedDate(new Date(date));
    } else {
      // Otherwise use the current selected date
      setCurrentMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
      setFocusedDate(new Date(selectedDate));
    }
    
    setIsOpen(true);
    
    // Announce to screen readers
    setMessage('Calendar dialog opened. Cursor keys can navigate dates.');
    
    // Focus handling
    setTimeout(() => {
      const focusableDay = calendarRef.current?.querySelector('[aria-selected="true"]') as HTMLElement;
      if (focusableDay) {
        focusableDay.focus();
      } else {
        const firstDay = calendarRef.current?.querySelector('button[tabindex="0"]') as HTMLElement;
        if (firstDay) firstDay.focus();
      }
    }, 10);
  }
  
  // Close the calendar
  function handleCloseCalendar() {
    setIsOpen(false);
    setMessage('');
    
    // Return focus to button
    setTimeout(() => {
      if (buttonRef.current) buttonRef.current.focus();
    }, 10);
  }
  
  // Handle OK button
  function handleOk() {
    onChange(focusedDate);
    setInputValue(formatDateForDisplay(focusedDate));
    handleCloseCalendar();
  }
  
  // Handle Cancel button
  function handleCancel() {
    handleCloseCalendar();
  }
  
  // Move to previous/next month
  function moveMonth(delta: number) {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + delta);
    setCurrentMonth(newMonth);
    
    // Try to keep the same day in the new month
    const newFocusDate = new Date(focusedDate);
    newFocusDate.setMonth(newFocusDate.getMonth() + delta);
    
    // If the day doesn't exist in the new month (e.g. Jan 31 -> Feb), use the last day of month
    const lastDayOfNewMonth = new Date(newFocusDate.getFullYear(), newFocusDate.getMonth() + 1, 0).getDate();
    if (newFocusDate.getDate() > lastDayOfNewMonth) {
      newFocusDate.setDate(lastDayOfNewMonth);
    }
    
    setFocusedDate(newFocusDate);
    
    // Announce month change to screen readers
    setMessage(`${monthNames[newMonth.getMonth()]} ${newMonth.getFullYear()}`);
  }
  
  // Handle day click
  function handleDayClick(date: Date) {
    if (!isDateInRange(date)) return;
    
    setFocusedDate(date);
    handleOk();
  }
  
  // Handle day key down
  function handleKeyDown(event: React.KeyboardEvent) {
    let newDate = new Date(focusedDate);
    let handled = true;
    
    switch (event.key) {
      case 'ArrowLeft':
        newDate.setDate(newDate.getDate() - 1);
        break;
      case 'ArrowRight':
        newDate.setDate(newDate.getDate() + 1);
        break;
      case 'ArrowUp':
        newDate.setDate(newDate.getDate() - 7);
        break;
      case 'ArrowDown':
        newDate.setDate(newDate.getDate() + 7);
        break;
      case 'Home':
        newDate = new Date(focusedDate.getFullYear(), focusedDate.getMonth(), 1);
        break;
      case 'End':
        newDate = new Date(
          focusedDate.getFullYear(), 
          focusedDate.getMonth() + 1, 
          0
        );
        break;
      case 'PageUp':
        if (event.shiftKey) {
          newDate.setFullYear(newDate.getFullYear() - 1);
        } else {
          newDate.setMonth(newDate.getMonth() - 1);
        }
        break;
      case 'PageDown':
        if (event.shiftKey) {
          newDate.setFullYear(newDate.getFullYear() + 1);
        } else {
          newDate.setMonth(newDate.getMonth() + 1);
        }
        break;
      case 'Enter':
      case ' ': // Space key
        handleDayClick(focusedDate);
        break;
      case 'Escape':
        handleCloseCalendar();
        break;
      case 'Tab':
        // Let tab navigation proceed naturally
        handled = false;
        break;
      default:
        handled = false;
    }
    
    if (handled) {
      event.preventDefault();
      
      // If new date is in a different month, update the calendar view
      if (isOtherMonth(newDate, currentMonth)) {
        setCurrentMonth(new Date(newDate.getFullYear(), newDate.getMonth(), 1));
      }
      
      setFocusedDate(newDate);
      setMessage(`${monthNames[newDate.getMonth()]} ${newDate.getDate()}, ${newDate.getFullYear()}`);
    }
  }
  
  // Handle input change
  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInputValue(e.target.value);
    
    const date = parseDateFromString(e.target.value);
    if (date && isDateInRange(date)) {
      onChange(date);
      setFocusedDate(date);
      setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    }
  }

  // Effect to handle clicks outside calendar
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        isOpen &&
        calendarRef.current && 
        !calendarRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        handleCloseCalendar();
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Update input value when selectedDate changes
  useEffect(() => {
    setInputValue(formatDateForDisplay(selectedDate));
  }, [selectedDate]);

  // Render the calendar
  function renderCalendar() {
    const { prevMonthDays, currentMonthDays, nextMonthDays } = generateCalendarDays();
    const allDays = [...prevMonthDays, ...currentMonthDays, ...nextMonthDays];
    const rows = [];
    
    // Create rows with 7 columns each
    for (let i = 0; i < allDays.length; i += 7) {
      const week = allDays.slice(i, i + 7);
      rows.push(
        <tr key={`week-${i}`}>
          {week.map((day, dayIndex) => {
            const isDisabled = isOtherMonth(day, currentMonth) || !isDateInRange(day);
            const isSelected = isSameDay(day, selectedDate);
            const isFocused = isSameDay(day, focusedDate);
            const isTodayDate = isToday(day);
            
            return (
              <td 
                key={`day-${i}-${dayIndex}`}
                className="p-0 text-center"
              >
                {isDisabled ? (
                  <div className="w-10 h-10 text-slate-300 dark:text-slate-600 flex items-center justify-center">
                    {day.getDate()}
                  </div>
                ) : (
                  <button
                    type="button"
                    className={`w-10 h-10 rounded-full focus:outline-none flex items-center justify-center
                      ${isSelected 
                        ? 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700' 
                        : isTodayDate 
                          ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50' 
                          : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200'
                      }
                      ${isFocused ? 'ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-slate-800' : ''}
                    `}
                    onClick={() => handleDayClick(day)}
                    onKeyDown={handleKeyDown}
                    tabIndex={isFocused ? 0 : -1}
                    aria-selected={isSelected}
                    aria-current={isTodayDate ? 'date' : undefined}
                  >
                    {day.getDate()}
                  </button>
                )}
              </td>
            );
          })}
        </tr>
      );
    }
    
    return rows;
  }

  // Check if a date is today
  function isToday(date: Date): boolean {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  }

  return (
    <div className="datepicker-container">
      <label htmlFor={`${id}-input`} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
        {label}
      </label>
      
      <div className="relative">
        <input
          type="text"
          id={`${id}-input`}
          ref={inputRef}
          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-slate-100 pr-10"
          value={inputValue}
          onChange={handleInputChange}
          placeholder="MM/DD/YYYY"
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-describedby={`${id}-description`}
        />
        
        <button
          ref={buttonRef}
          type="button"
          className="absolute right-3 top-2.5 text-slate-400 dark:text-slate-500 hover:text-slate-500 dark:hover:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 rounded-full p-1"
          onClick={handleOpenCalendar}
          aria-label={getButtonLabel(selectedDate)}
        >
          <Calendar size={18} aria-hidden="true" />
        </button>
        
        <p className="sr-only" id={`${id}-description`}>
          Date format is MM/DD/YYYY. Use the button to open a calendar for selecting dates.
        </p>
        
        {isOpen && (
          <div
            ref={calendarRef}
            role="dialog"
            aria-label="Date picker"
            aria-modal="true"
            className="absolute z-50 mt-2 bg-white dark:bg-slate-800 rounded-lg shadow-lg p-4 border border-slate-200 dark:border-slate-700 w-auto min-w-[320px]"
            onKeyDown={handleKeyDown}
          >
            <div className="flex justify-between items-center mb-4">
              <button
                type="button"
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
                onClick={() => moveMonth(-1)}
                aria-label="Previous month"
              >
                <ChevronLeft size={20} />
              </button>
              
              <h2 id={`${id}-calendar-heading`} className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </h2>
              
              <button
                type="button"
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
                onClick={() => moveMonth(1)}
                aria-label="Next month"
              >
                <ChevronRight size={20} />
              </button>
            </div>
            
            <table className="w-full border-collapse" aria-labelledby={`${id}-calendar-heading`}>
              <thead>
                <tr>
                  {dayAbbr.map((day, index) => (
                    <th 
                      key={day} 
                      scope="col" 
                      className="text-center font-medium text-xs p-1 text-slate-500 dark:text-slate-400"
                      aria-label={dayLabels[index]}
                    >
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {renderCalendar()}
              </tbody>
            </table>
            
            <div className="flex justify-end mt-4 gap-2">
              <button
                type="button"
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
                onClick={handleCancel}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
                onClick={handleOk}
              >
                OK
              </button>
            </div>
            
            <div 
              id={`${id}-dialog-message`}
              className="sr-only"
              aria-live="polite"
            >
              Use arrow keys to navigate dates
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccessibleDatepicker;