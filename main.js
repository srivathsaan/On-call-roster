// Define the team members
const teamMembers = ['Alice', 'Bob', 'Charlie', 'David'];
// New list of names for admin login dropdown
const adminNames = ['Alice', 'Bob', 'Charlie', 'David', 'Elliot'];

// Define a simple admin password (for demonstration purposes only)
const ADMIN_PASSWORD = 'admin'; // You can change this password

// Authentication flag and logged-in user's name
let isAuthenticated = false;
let loggedInUserName = '';

// Define shift timings (in 24-hour format for easier comparison)
const shiftTimings = {
    morning: { key: 'morning', display: '6:30 am - 2:30 pm', startHour: 6, startMinute: 30, endHour: 14, endMinute: 30, crossesMidnight: false },
    afternoon: { key: 'afternoon', display: '2:30 pm - 10:30 pm', startHour: 14, startMinute: 30, endHour: 22, endMinute: 30, crossesMidnight: false },
    night: { key: 'night', display: '10:30 pm - 6:30 am', startHour: 22, startMinute: 30, endHour: 6, endMinute: 30, crossesMidnight: true }
};

// Get elements from the DOM
const weekRangeElement = document.getElementById('weekRange');
const rosterTableBody = document.querySelector('#rosterTable tbody');
const prevWeekBtn = document.getElementById('prevWeekBtn');
const nextWeekBtn = document.getElementById('nextWeekBtn');
const adminLoginBtn = document.getElementById('adminLoginBtn');
const recordReplacementBtn = document.getElementById('recordReplacementBtn');
const loginModal = document.getElementById('loginModal');
const closeLoginModalBtn = document.getElementById('closeLoginModalBtn');
const cancelLoginBtn = document.getElementById('cancelLoginBtn');
const loginForm = document.getElementById('loginForm');
const adminNameSelect = document.getElementById('adminName');
const adminPasswordInput = document.getElementById('adminPassword');
const loginError = document.getElementById('loginError');

const replacementModal = document.getElementById('replacementModal');
const closeReplacementModalBtn = document.getElementById('closeReplacementModalBtn');
const cancelReplacementFormBtn = document.getElementById('cancelReplacementFormBtn');
const replacementForm = document.getElementById('replacementForm');
const replacementDateInput = document.getElementById('replacementDate');
const replacementShiftSelect = document.getElementById('replacementShift');
const originalPersonSelect = document.getElementById('originalPerson');
const replacementPersonSelect = document.getElementById('replacementPerson');
const changerNameInput = document.getElementById('changerName');
const replacementRecordsContainer = document.getElementById('replacementRecordsContainer');
const noRecordsMessage = document.getElementById('noRecordsMessage');
const originalPersonWarning = document.getElementById('originalPersonWarning');

// Elements for replacement type selection
const replacementTypeRadios = document.querySelectorAll('input[name="replacementType"]');
const fullShiftFields = document.getElementById('fullShiftFields');
const partialShiftFields = document.getElementById('partialShiftFields');
const replacementStartTimeInput = document.getElementById('replacementStartTime');
const replacementEndTimeInput = document.getElementById('replacementEndTime');
const timeError = document.getElementById('timeError');


// Initialize current week's start date (set to the Monday of the current week)
let currentWeekStart = new Date();
currentWeekStart.setDate(currentWeekStart.getDate() - (currentWeekStart.getDay() + 6) % 7);
currentWeekStart.setHours(0, 0, 0, 0);

// Array to store replacement event records
const replacementEvents = [];

/**
 * Formats a Date object into a readable date string (e.g., "Mon, Jan 1").
 * @param {Date} date The date object to format.
 * @returns {string} The formatted date string.
 */
function formatDate(date) {
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

/**
 * Formats a Date object into a 'YYYY-MM-DD' string for comparison.
 * @param {Date} date The date object to format.
 * @returns {string} The formatted date string (e.g., "2023-01-01").
 */
function formatDateYYYYMMDD(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Gets the current time in IST (Indian Standard Time).
 * @returns {Date} A Date object representing the current time in IST.
 */
function getCurrentISTTime() {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const istOffset = 330 * 60000;
    const istTime = new Date(utc + istOffset);
    return istTime;
}

/**
 * Determines the currently active shift based on the provided time (in IST).
 * @param {Date} istTime The current time in IST.
 * @returns {string|null} The name of the active shift ('morning', 'afternoon', 'night') or null if none.
 */
function getActiveShift(istTime) {
    const currentHour = istTime.getHours();
    const currentMinute = istTime.getMinutes();

    function isTimeInShift(hour, minute, shift) {
        const startTotalMinutes = shift.startHour * 60 + shift.startMinute;
        const endTotalMinutes = shift.endHour * 60 + shift.endMinute;
        const currentTotalMinutes = hour * 60 + minute;

        if (shift.crossesMidnight) {
            return currentTotalMinutes >= startTotalMinutes || currentTotalMinutes < endTotalMinutes;
        } else {
            return currentTotalMinutes >= startTotalMinutes && currentTotalMinutes < endTotalMinutes;
        }
    }

    if (isTimeInShift(currentHour, currentMinute, shiftTimings.morning)) {
        return 'morning';
    } else if (isTimeInShift(currentHour, currentMinute, shiftTimings.afternoon)) {
        return 'afternoon';
    } else if (isTimeInShift(currentHour, currentMinute, shiftTimings.night)) {
        return 'night';
    }
    return null;
}

/**
 * Checks if a given time (hour, minute) falls within a specified time range.
 * Handles ranges that cross midnight.
 * @param {number} checkHour The hour to check.
 * @param {number} checkMinute The minute to check.
 * @param {object} range The range object with startHour, startMinute, endHour, endMinute, crossesMidnight.
 * @returns {boolean} True if the time is within the range, false otherwise.
 */
function isTimeWithinRange(checkHour, checkMinute, range) {
    const checkTotalMinutes = checkHour * 60 + checkMinute;
    let startTotalMinutes = range.startHour * 60 + range.startMinute;
    let endTotalMinutes = range.endHour * 60 + range.endMinute;

    if (range.crossesMidnight) {
        if (endTotalMinutes <= startTotalMinutes) {
            endTotalMinutes += 24 * 60;
        }
        if (checkTotalMinutes < startTotalMinutes) {
            checkTotalMinutes += 24 * 60;
        }
    }
    return checkTotalMinutes >= startTotalMinutes && checkTotalMinutes < endTotalMinutes;
}


/**
 * Checks if a given date string (YYYY-MM-DD) is in the same month as
 * the reference date, or in a future month.
 * @param {string} dateStringYYYYMMDD The date string to check.
 * @param {Date} referenceDate The date to compare against (e.g., currentWeekStart).
 * @returns {boolean} True if the date is in the current or future month, false otherwise.
 */
function isDateInCurrentOrFutureMonth(dateStringYYYYMMDD, referenceDate) {
    const eventDate = new Date(dateStringYYYYMMDD + 'T00:00:00');
    const refYear = referenceDate.getFullYear();
    const refMonth = referenceDate.getMonth();

    const eventYear = eventDate.getFullYear();
    const eventMonth = eventDate.getMonth();

    if (eventYear > refYear) {
        return true;
    }
    if (eventYear === refYear && eventMonth >= refMonth) {
        return true;
    }
    return false;
}

/**
 * Checks if two time ranges overlap.
 * @param {string} start1 HH:MM
 * @param {string} end1 HH:MM
 * @param {string} start2 HH:MM
 * @param {string} end2 HH:MM
 * @param {boolean} range1CrossesMidnight True if range1 crosses midnight.
 * @param {boolean} range2CrossesMidnight True if range2 crosses midnight.
 * @returns {boolean} True if the time ranges overlap, false otherwise.
 */
function isTimeRangeOverlap(start1, end1, start2, end2, range1CrossesMidnight = false, range2CrossesMidnight = false) {
    const parseTime = (timeStr) => {
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + m;
    };

    let s1 = parseTime(start1);
    let e1 = parseTime(end1);
    let s2 = parseTime(start2);
    let e2 = parseTime(end2);

    if (range1CrossesMidnight) {
        if (e1 <= s1) e1 += 24 * 60;
    }
    if (range2CrossesMidnight) {
        if (e2 <= s2) e2 += 24 * 60;
    }

    return s1 < e2 && s2 < e1;
}


/**
 * Generates the roster for a given week based on the specified rotating schedule,
 * applying only full-shift replacements. Partial replacements are handled dynamically
 * during display.
 * @param {Date} weekStartDate The Monday of the week for which to generate the roster.
 * @returns {Array<Object>} An array of daily roster objects.
 */
function generateRoster(weekStartDate) {
    const roster = [];
    const oneDay = 24 * 60 * 60 * 1000;
    const firstMondayOfEpoch = new Date('2023-01-02T00:00:00Z');
    const daysSinceEpoch = Math.floor((weekStartDate.getTime() - firstMondayOfEpoch.getTime()) / oneDay);
    const weekIndex = Math.floor(daysSinceEpoch / 7);

    const weeklyBaseIndex = (weekIndex * 3) % teamMembers.length;

    const morningPerson = teamMembers[(weeklyBaseIndex + 0) % teamMembers.length];
    const afternoonPerson = teamMembers[(weeklyBaseIndex + 1) % teamMembers.length];
    const nightPerson = teamMembers[(weeklyBaseIndex + 2) % teamMembers.length];
    const offCallPerson = teamMembers[(weeklyBaseIndex + 3) % teamMembers.length];

    for (let i = 0; i < 7; i++) {
        const currentDate = new Date(weekStartDate);
        currentDate.setDate(currentDate.getDate() + i);
        const currentFormattedDate = formatDateYYYYMMDD(currentDate);

        const dayOfWeek = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
        const dateString = formatDate(currentDate);

        let dayRoster = {};
        let isWeekend = (i === 5 || i === 6);

        if (!isWeekend) {
            dayRoster = {
                day: dayOfWeek,
                date: dateString,
                morning: morningPerson,
                afternoon: afternoonPerson,
                night: nightPerson,
                offCall: offCallPerson,
            };
        } else {
            dayRoster = {
                day: dayOfWeek,
                date: dateString,
                morning: offCallPerson,
                afternoon: offCallPerson,
                night: offCallPerson,
                offCall: 'N/A (Weekend On-Call)',
            };
        }

        // Apply full-shift replacement events
        replacementEvents.forEach(event => {
            if (isDateInCurrentOrFutureMonth(event.date, weekStartDate) && event.date === currentFormattedDate && event.type === 'full-shift') {
                // Ensure the replacement applies to the correct day (weekday vs weekend)
                const eventDateObj = new Date(event.date + 'T00:00:00');
                const eventDayOfWeek = eventDateObj.getDay();
                const eventIsWeekend = (eventDayOfWeek === 0 || eventDayOfWeek === 6);

                if (event.shift === 'weekend' && eventIsWeekend) {
                    dayRoster.morning = event.replacement;
                    dayRoster.afternoon = event.replacement;
                    dayRoster.night = event.replacement;
                } else if (dayRoster.hasOwnProperty(event.shift) && !eventIsWeekend) {
                    dayRoster[event.shift] = event.replacement;
                }
            }
        });

        roster.push(dayRoster);
    }
    return roster;
}

/**
 * Returns the person currently assigned to a specific shift on a given date,
 * taking into account all full-shift replacements.
 * This function is used for auto-filling and validating the "Original Person" dropdown.
 * @param {string} dateYYYYMMDD The date in YYYY-MM-DD format.
 * @param {string} shiftType The type of shift ('morning', 'afternoon', 'night', 'offCall').
 * @returns {string|null} The name of the person or 'N/A (Weekend On-Call)' for weekend off-call, or null if invalid shift.
 */
function getOriginalPersonForShift(dateYYYYMMDD, shiftType) {
    const targetDate = new Date(dateYYYYMMDD + 'T00:00:00');
    const dayOfWeek = targetDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

    // Calculate the Monday of the target week
    let weekStartDate = new Date(targetDate);
    weekStartDate.setDate(targetDate.getDate() - (dayOfWeek + 6) % 7);
    weekStartDate.setHours(0, 0, 0, 0);

    const oneDay = 24 * 60 * 60 * 1000;
    const firstMondayOfEpoch = new Date('2023-01-02T00:00:00Z');
    const daysSinceEpoch = Math.floor((weekStartDate.getTime() - firstMondayOfEpoch.getTime()) / oneDay);
    const weekIndex = Math.floor(daysSinceEpoch / 7);
    const weeklyBaseIndex = (weekIndex * 3) % teamMembers.length;

    let person = null;
    const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6); // Sunday or Saturday

    if (!isWeekend) {
        switch (shiftType) {
            case 'morning': person = teamMembers[(weeklyBaseIndex + 0) % teamMembers.length]; break;
            case 'afternoon': person = teamMembers[(weeklyBaseIndex + 1) % teamMembers.length]; break;
            case 'night': person = teamMembers[(weeklyBaseIndex + 2) % teamMembers.length]; break;
            case 'offCall': person = teamMembers[(weeklyBaseIndex + 3) % teamMembers.length]; break;
            default: return null;
        }
    } else {
        // Weekend shifts are covered by the weekday off-call person
        switch (shiftType) {
            case 'morning':
            case 'afternoon':
            case 'night': person = teamMembers[(weeklyBaseIndex + 3) % teamMembers.length]; break;
            case 'offCall': person = 'N/A (Weekend On-Call)'; break;
            default: return null;
        }
    }

    // Filter all relevant full-shift replacements for this date and shift
    const relevantFullShiftReplacements = replacementEvents.filter(event =>
        event.date === dateYYYYMMDD &&
        event.type === 'full-shift' &&
        event.shift === shiftType &&
        isDateInCurrentOrFutureMonth(event.date, currentWeekStart) // Ensure it's not a past month's record
    );

    // Sort them by timestamp in descending order (newest first)
    relevantFullShiftReplacements.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // If there's a latest replacement, return its replacement person
    if (relevantFullShiftReplacements.length > 0) {
        return relevantFullShiftReplacements[0].replacement;
    }

    // Otherwise, return the base rotational person
    return person;
}

/**
 * Returns the person originally assigned to a specific shift on a given date
 * based purely on the roster generation logic, ignoring any replacements.
 * This is used specifically for the `shift-replaced` highlight logic to compare
 * against the *initial* assignment.
 * @param {string} dateYYYYMMDD The date in YYYY-MM-DD format.
 * @param {string} shiftType The type of shift ('morning', 'afternoon', 'night', 'offCall').
 * @returns {string|null} The name of the person or 'N/A (Weekend On-Call)' for weekend off-call, or null if invalid shift.
 */
function getOriginalPersonForShiftPure(dateYYYYMMDD, shiftType) {
    const targetDate = new Date(dateYYYYMMDD + 'T00:00:00');
    const dayOfWeek = targetDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

    // Calculate the Monday of the target week
    let weekStartDate = new Date(targetDate);
    weekStartDate.setDate(targetDate.getDate() - (dayOfWeek + 6) % 7);
    weekStartDate.setHours(0, 0, 0, 0);

    const oneDay = 24 * 60 * 60 * 1000;
    const firstMondayOfEpoch = new Date('2023-01-02T00:00:00Z');
    const daysSinceEpoch = Math.floor((weekStartDate.getTime() - firstMondayOfEpoch.getTime()) / oneDay);
    const weekIndex = Math.floor(daysSinceEpoch / 7);
    const weeklyBaseIndex = (weekIndex * 3) % teamMembers.length;

    let person = null;
    const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6); // Sunday or Saturday

    if (!isWeekend) {
        switch (shiftType) {
            case 'morning': person = teamMembers[(weeklyBaseIndex + 0) % teamMembers.length]; break;
            case 'afternoon': person = teamMembers[(weeklyBaseIndex + 1) % teamMembers.length]; break;
            case 'night': person = teamMembers[(weeklyBaseIndex + 2) % teamMembers.length]; break;
            case 'offCall': person = teamMembers[(weeklyBaseIndex + 3) % teamMembers.length]; break;
            default: return null;
        }
    } else {
        switch (shiftType) {
            case 'morning':
            case 'afternoon':
            case 'night': person = teamMembers[(weeklyBaseIndex + 3) % teamMembers.length]; break;
            case 'offCall': person = 'N/A (Weekend On-Call)'; break;
            default: return null;
        }
    }
    return person;
}


/**
 * Displays the generated roster in the HTML table, applying dynamic highlights
 * for active partial replacements.
 * @param {Array<Object>} roster The roster data to display.
 * @param {Date} weekStartDate The start date of the current week.
 */
function displayRoster(roster, weekStartDate) {
    rosterTableBody.innerHTML = '';

    const currentISTTime = getCurrentISTTime();
    const currentISTDateFormatted = formatDateYYYYMMDD(currentISTTime);
    const activeShift = getActiveShift(currentISTTime);

    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekStartDate.getDate() + 6);
    weekRangeElement.textContent = `${formatDate(weekStartDate)} - ${formatDate(weekEndDate)}`;

    roster.forEach((day, index) => {
        const row = rosterTableBody.insertRow();
        row.classList.add('hover:bg-gray-50', 'transition-colors', 'duration-150');

        if (index === 5 || index === 6) {
            row.classList.add('bg-gray-100', 'font-semibold', 'text-gray-700');
        }

        row.insertCell().textContent = day.day;
        row.insertCell().textContent = day.date;

        function renderShiftCell(personName, shiftType) {
            const cell = row.insertCell();
            cell.classList.add('font-medium', 'py-1', 'px-2', 'rounded-md');

            let applyReplacedHighlight = false;
            let displayedPerson = personName; // This `personName` already reflects the base roster + full-shift replacements

            // Check for active partial-shift replacements for the current day and time
            const partialReplacementsForThisDay = replacementEvents.filter(event =>
                event.date === formatDateYYYYMMDD(new Date(weekStartDate.getFullYear(), weekStartDate.getMonth(), weekStartDate.getDate() + index)) &&
                event.type === 'partial-shift' &&
                isDateInCurrentOrFutureMonth(event.date, currentWeekStart)
            );

            // Only apply active partial replacement logic if the cell's date is today
            if (currentISTDateFormatted === formatDateYYYYMMDD(new Date(weekStartDate.getFullYear(), weekStartDate.getMonth(), weekStartDate.getDate() + index))) {
                const currentISTHour = currentISTTime.getHours();
                const currentISTMinute = currentISTTime.getMinutes();

                for (const event of partialReplacementsForThisDay) {
                    const partialEventRange = {
                        startHour: parseInt(event.startTime.split(':')[0]),
                        startMinute: parseInt(event.startTime.split(':')[1]),
                        endHour: parseInt(event.endTime.split(':')[0]),
                        endMinute: parseInt(event.endTime.split(':')[1]),
                        crossesMidnight: event.crossesMidnight
                    };

                    if (isTimeWithinRange(currentISTHour, currentISTMinute, partialEventRange) &&
                        shiftTimings[shiftType] && // Check if it's a valid shift type with defined timings
                        isTimeRangeOverlap(shiftTimings[shiftType].startHour + ':' + shiftTimings[shiftType].startMinute,
                                           shiftTimings[shiftType].endHour + ':' + shiftTimings[shiftType].endMinute,
                                           event.startTime, event.endTime,
                                           shiftTimings[shiftType].crossesMidnight,
                                           event.crossesMidnight)) {
                        displayedPerson = event.replacement; // This is the key: override with the partial replacement person
                        applyReplacedHighlight = true; // Mark for highlight
                        break; // Found the active partial replacement, no need to check others for this cell
                    }
                }
            }

            cell.textContent = displayedPerson; // Set the text content based on the final determined person

            // Apply highlight if it's a full shift replacement OR an active partial replacement
            // `personName` already reflects full-shift changes from `generateRoster`.
            // So, if `displayedPerson` is different from `personName` (due to an *active partial replacement*)
            // OR if `personName` itself is different from the *original rotational person* (due to a full-shift replacement)
            // then apply the highlight.
            const originalRotationalPerson = getOriginalPersonForShiftPure(formatDateYYYYMMDD(new Date(weekStartDate.getFullYear(), weekStartDate.getMonth(), weekStartDate.getDate() + index)), shiftType);

            if (displayedPerson !== originalRotationalPerson || applyReplacedHighlight) {
                cell.classList.add('shift-replaced');
            } else {
                // Apply original shift colors for weekdays, neutral for weekends
                if (index >= 0 && index <= 4) { // Weekday
                    if (shiftType === 'morning') cell.classList.add('shift-morning');
                    else if (shiftType === 'afternoon') cell.classList.add('shift-afternoon');
                    else if (shiftType === 'night') cell.classList.add('shift-night');
                    else if (shiftType === 'offCall') cell.classList.add('shift-off');
                } else { // Weekend
                    cell.classList.add('bg-gray-200', 'text-gray-800');
                    if (shiftType === 'offCall') {
                        cell.classList.remove('bg-gray-200', 'text-gray-800');
                        cell.classList.add('bg-gray-300', 'text-gray-600');
                    }
                }
            }

            // Apply highlight if this is the current active shift
            if (currentISTDateFormatted === formatDateYYYYMMDD(new Date(weekStartDate.getFullYear(), weekStartDate.getMonth(), weekStartDate.getDate() + index)) && activeShift === shiftType) {
                cell.classList.add('current-on-call');
            }
        }

        renderShiftCell(day.morning, 'morning');
        renderShiftCell(day.afternoon, 'afternoon');
        renderShiftCell(day.night, 'night');
        renderShiftCell(day.offCall, 'offCall');
    });
}

/**
 * Updates the roster for the current week and re-displays it.
 */
function updateRosterDisplay() {
    const roster = generateRoster(currentWeekStart);
    displayRoster(roster, currentWeekStart);
    renderReplacementCards();
}

/**
 * Populates the originalPerson and replacementPerson dropdowns.
 * @param {string|null} excludePerson If provided, this person will be excluded from the replacementPersonSelect.
 */
function populatePersonDropdowns(excludePerson = null) {
    originalPersonSelect.innerHTML = '<option value="">Select original person</option>';
    replacementPersonSelect.innerHTML = '<option value="">Select replacement person</option>';

    teamMembers.forEach(member => {
        const option1 = document.createElement('option');
        option1.value = member;
        option1.textContent = member;
        originalPersonSelect.appendChild(option1);

        if (member !== excludePerson) {
            const option2 = document.createElement('option');
            option2.value = member;
            option2.textContent = member;
            replacementPersonSelect.appendChild(option2);
        }
    });
}

/**
 * Populates the admin name dropdown in the login modal.
 */
function populateAdminNameDropdown() {
    adminNameSelect.innerHTML = '<option value="">Select your name</option>';
    adminNames.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        adminNameSelect.appendChild(option);
    });
}

/**
 * Populates the notes shift dropdown.
 */
function populateNotesShiftDropdown() {
    notesShiftSelect.innerHTML = '<option value="">Select a shift</option>';
    // Only populate morning, afternoon, night for notes generation
    ['morning', 'afternoon', 'night'].forEach(shiftKey => {
        const option = document.createElement('option');
        option.value = shiftKey;
        option.textContent = shiftKey.charAt(0).toUpperCase() + shiftKey.slice(1); // Capitalize first letter
        notesShiftSelect.appendChild(option);
    });
}

/**
 * Opens the login modal.
 */
function openLoginModal() {
    loginModal.classList.remove('hidden');
    populateAdminNameDropdown();
    adminNameSelect.value = '';
    adminPasswordInput.value = '';
    loginError.classList.add('hidden');
}

/**
 * Closes the login modal.
 */
function closeLoginModal() {
    loginModal.classList.add('hidden');
    adminNameSelect.value = '';
    adminPasswordInput.value = '';
    loginError.classList.add('hidden');
}

/**
 * Opens the replacement modal.
 */
function openReplacementModal() {
    replacementModal.classList.remove('hidden');
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    replacementDateInput.value = `${year}-${month}-${day}`;
    
    // Set default radio button to full-shift
    replacementTypeRadios[0].checked = true;
    toggleReplacementFields(); // Show full-shift fields by default

    // Initial population and validation based on default date/shift
    updateOriginalAndReplacementPersons(); // Call this to auto-fill and filter
    
    timeError.classList.add('hidden');
    originalPersonWarning.classList.add('hidden');

    if (isAuthenticated && loggedInUserName) {
        changerNameInput.value = loggedInUserName;
        changerNameInput.setAttribute('readonly', 'true');
        changerNameInput.classList.add('bg-gray-100');
    } else {
        changerNameInput.value = '';
        changerNameInput.removeAttribute('readonly');
        changerNameInput.classList.remove('bg-gray-100');
    }

    // Add event listeners for dynamic validation/population
    replacementDateInput.addEventListener('change', updateOriginalAndReplacementPersons);
    replacementShiftSelect.addEventListener('change', updateOriginalAndReplacementPersons);
    replacementStartTimeInput.addEventListener('change', updateOriginalAndReplacementPersons);
    replacementEndTimeInput.addEventListener('change', updateOriginalAndReplacementPersons);
    originalPersonSelect.addEventListener('change', validateOriginalPersonSelection);
    replacementTypeRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            toggleReplacementFields();
            updateOriginalAndReplacementPersons();
        });
    });
}

/**
 * Closes the replacement modal and resets the form.
 */
function closeReplacementModal() {
    replacementModal.classList.add('hidden');
    replacementForm.reset();
    timeError.classList.add('hidden');
    originalPersonWarning.classList.add('hidden');
    changerNameInput.removeAttribute('readonly');
    changerNameInput.classList.remove('bg-gray-100');

    // Remove event listeners to prevent multiple bindings
    replacementDateInput.removeEventListener('change', updateOriginalAndReplacementPersons);
    replacementShiftSelect.removeEventListener('change', updateOriginalAndReplacementPersons);
    replacementStartTimeInput.removeEventListener('change', updateOriginalAndReplacementPersons);
    replacementEndTimeInput.removeEventListener('change', updateOriginalAndReplacementPersons);
    originalPersonSelect.removeEventListener('change', validateOriginalPersonSelection);
    replacementTypeRadios.forEach(radio => {
        radio.removeEventListener('change', () => {
            toggleReplacementFields();
            updateOriginalAndReplacementPersons();
        });
    });
}

/**
 * Toggles visibility of full-shift vs. partial-shift fields in the modal.
 */
function toggleReplacementFields() {
    if (document.querySelector('input[name="replacementType"]:checked').value === 'full-shift') {
        fullShiftFields.classList.remove('hidden');
        partialShiftFields.classList.add('hidden');
        replacementShiftSelect.setAttribute('required', 'true');
        replacementStartTimeInput.removeAttribute('required');
        replacementEndTimeInput.removeAttribute('required');
    } else {
        fullShiftFields.classList.add('hidden');
        partialShiftFields.classList.remove('hidden');
        replacementShiftSelect.removeAttribute('required');
        replacementStartTimeInput.setAttribute('required', 'true');
        replacementEndTimeInput.setAttribute('required', 'true');
    }
    timeError.classList.add('hidden');
}

/**
 * Automatically updates the "Original Person" and "Replacement Person" dropdowns
 * based on the selected date and shift, and the replacement type.
 */
function updateOriginalAndReplacementPersons() {
    const selectedDate = replacementDateInput.value;
    const selectedShift = replacementShiftSelect.value;
    const replacementType = document.querySelector('input[name="replacementType"]:checked').value;

    let actualOriginalPersonForDisplay = '';

    if (selectedDate) {
        if (replacementType === 'full-shift' && selectedShift) {
            actualOriginalPersonForDisplay = getOriginalPersonForShift(selectedDate, selectedShift);
        } else if (replacementType === 'partial-shift') {
            const startTime = replacementStartTimeInput.value;
            const endTime = replacementEndTimeInput.value;

            if (startTime && endTime) {
                let primaryOverlappingShiftKey = null;
                let maxOverlapMinutes = 0;

                const parseTime = (timeStr) => {
                    const [h, m] = timeStr.split(':').map(Number);
                    return h * 60 + m;
                };

                let partialStartMinutes = parseTime(startTime);
                let partialEndMinutes = parseTime(endTime);
                let partialCrossesMidnight = (partialEndMinutes <= partialStartMinutes);
                if (partialCrossesMidnight) partialEndMinutes += 24 * 60;


                for (const shiftKey in shiftTimings) {
                    if (shiftKey === 'offCall') continue;

                    const currentShift = shiftTimings[shiftKey];
                    let shiftStartMinutes = currentShift.startHour * 60 + currentShift.startMinute;
                    let shiftEndMinutes = currentShift.endHour * 60 + currentShift.endMinute;
                    if (currentShift.crossesMidnight) shiftEndMinutes += 24 * 60;

                    const overlapStart = Math.max(partialStartMinutes, shiftStartMinutes);
                    const overlapEnd = Math.min(partialEndMinutes, shiftEndMinutes);
                    const overlapDuration = overlapEnd - overlapStart;

                    if (overlapDuration > maxOverlapMinutes) {
                        maxOverlapMinutes = overlapDuration;
                        primaryOverlappingShiftKey = shiftKey;
                    }
                }

                if (primaryOverlappingShiftKey) {
                    actualOriginalPersonForDisplay = getOriginalPersonForShift(selectedDate, primaryOverlappingShiftKey);
                }
            }
        }
    }

    // Populate original person dropdown
    originalPersonSelect.innerHTML = '<option value="">Select original person</option>';
    teamMembers.forEach(member => {
        const option = document.createElement('option');
        option.value = member;
        option.textContent = member;
        originalPersonSelect.appendChild(option);
    });

    // Set the value if found
    if (actualOriginalPersonForDisplay) {
        originalPersonSelect.value = actualOriginalPersonForDisplay;
    } else {
        originalPersonSelect.value = '';
    }

    // Now populate replacement person dropdown, excluding the currently selected original person
    populatePersonDropdowns(originalPersonSelect.value);

    // Run the validation after updating the dropdowns
    validateOriginalPersonSelection();
}


/**
 * Validates the "Original Person" selection against the calculated roster.
 * Displays a warning if there's a mismatch.
 */
function validateOriginalPersonSelection() {
    const selectedDate = replacementDateInput.value;
    const selectedOriginalPerson = originalPersonSelect.value;
    const replacementType = document.querySelector('input[name="replacementType"]:checked').value;

    originalPersonWarning.classList.add('hidden');

    if (!selectedDate || !selectedOriginalPerson) {
        return;
    }

    let actualOriginalPersonBasedOnRoster = null;

    if (replacementType === 'full-shift') {
        const selectedShift = replacementShiftSelect.value;
        if (selectedShift) {
            actualOriginalPersonBasedOnRoster = getOriginalPersonForShift(selectedDate, selectedShift);
        }
    } else { // partial-shift
        const startTime = replacementStartTimeInput.value;
        const endTime = replacementEndTimeInput.value;

        if (startTime && endTime) {
            let primaryOverlappingShiftKey = null;
            let maxOverlapMinutes = 0;

            const parseTime = (timeStr) => {
                const [h, m] = timeStr.split(':').map(Number);
                return h * 60 + m;
            };

            let partialStartMinutes = parseTime(startTime);
            let partialEndMinutes = parseTime(endTime);
            let partialCrossesMidnight = (partialEndMinutes <= partialStartMinutes);
            if (partialCrossesMidnight) partialEndMinutes += 24 * 60;

            for (const shiftKey in shiftTimings) {
                if (shiftKey === 'offCall') continue;

                const currentShift = shiftTimings[shiftKey];
                let shiftStartMinutes = currentShift.startHour * 60 + currentShift.startMinute;
                let shiftEndMinutes = currentShift.endHour * 60 + currentShift.endMinute;
                if (currentShift.crossesMidnight) shiftEndMinutes += 24 * 60;

                const overlapStart = Math.max(partialStartMinutes, shiftStartMinutes);
                const overlapEnd = Math.min(partialEndMinutes, shiftEndMinutes);
                const overlapDuration = overlapEnd - overlapStart;

                if (overlapDuration > maxOverlapMinutes) {
                    maxOverlapMinutes = overlapDuration;
                    primaryOverlappingShiftKey = shiftKey;
                }
            }

            if (primaryOverlappingShiftKey) {
                actualOriginalPersonBasedOnRoster = getOriginalPersonForShift(selectedDate, primaryOverlappingShiftKey);
            }
        }
    }

    if (actualOriginalPersonBasedOnRoster && selectedOriginalPerson !== actualOriginalPersonBasedOnRoster) {
        originalPersonWarning.textContent = `Warning: According to the current roster (including full-shift replacements), ${actualOriginalPersonBasedOnRoster} is on call for the encompassing shift on ${selectedDate}. You selected ${selectedOriginalPerson}.`;
        originalPersonWarning.classList.remove('hidden');
    }
}


/**
 * Renders the replacement event cards in the dedicated container.
 */
function renderReplacementCards() {
    replacementRecordsContainer.innerHTML = '<h3 class="text-2xl font-bold text-gray-800 mb-4 text-center">Replacement History</h3>';

    const filteredEvents = replacementEvents.filter(event =>
        isDateInCurrentOrFutureMonth(event.date, currentWeekStart)
    );

    if (filteredEvents.length === 0) {
        replacementRecordsContainer.innerHTML += '<div id="noRecordsMessage" class="text-center text-gray-500 italic">No replacement records yet.</div>';
        return;
    }

    if (noRecordsMessage) {
        noRecordsMessage.style.display = 'none';
    }

    const sortedEvents = [...filteredEvents].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    sortedEvents.forEach((event) => {
        const card = document.createElement('div');
        card.classList.add(
            'bg-white', 'p-4', 'rounded-lg', 'shadow-md', 'mb-4',
            'border', 'border-blue-200', 'flex', 'flex-col', 'space-y-2'
        );

        const dateElem = document.createElement('p');
        dateElem.classList.add('text-sm', 'text-gray-500');
        dateElem.textContent = `Recorded on: ${new Date(event.timestamp).toLocaleString()}`;

        const detailsElem = document.createElement('p');
        detailsElem.classList.add('text-gray-700', 'font-medium');

        let shiftDisplay = '';
        if (event.type === 'full-shift') {
            shiftDisplay = event.shift === 'morning' ? 'Morning' :
                           event.shift === 'afternoon' ? 'Afternoon' :
                           event.shift === 'night' ? 'Night' :
                           event.shift === 'offCall' ? 'Off-Call' :
                           event.shift === 'weekend' ? 'Weekend All Shifts' : event.shift;
            shiftDisplay = `Full Shift: ${shiftDisplay}`;
        } else {
            shiftDisplay = `Specific Time: ${event.startTime} - ${event.endTime}`;
        }


        detailsElem.innerHTML = `
            <span class="text-blue-600 font-semibold">${event.replacement}</span> replaced
            <span class="text-red-600 font-semibold">${event.original}</span>
            for <span class="text-purple-600 font-semibold">${shiftDisplay}</span>
            on <span class="font-bold">${event.date}</span>.
        `;

        const changerElem = document.createElement('p');
        changerElem.classList.add('text-sm', 'text-gray-600', 'italic');
        changerElem.textContent = `Change recorded by: ${event.changer}`;

        const revertButton = document.createElement('button');
        revertButton.textContent = 'Revert Change';
        revertButton.classList.add(
            'mt-3', 'bg-red-500', 'hover:bg-red-600', 'text-white',
            'font-semibold', 'py-1.5', 'px-3', 'rounded-lg', 'shadow-md',
            'transition', 'duration-300', 'ease-in-out', 'transform', 'hover:scale-105',
            'self-end'
        );
        const originalEventIndex = replacementEvents.findIndex(e =>
            e.date === event.date &&
            e.type === event.type &&
            e.shift === event.shift &&
            e.startTime === event.startTime &&
            e.endTime === event.endTime &&
            e.original === event.original &&
            e.replacement === event.replacement &&
            e.changer === event.changer &&
            e.timestamp === event.timestamp
        );
        revertButton.dataset.index = originalEventIndex;

        if (isAuthenticated) {
            revertButton.classList.remove('hidden');
        } else {
            revertButton.classList.add('hidden');
        }

        revertButton.addEventListener('click', (e) => {
            const eventIndex = parseInt(e.target.dataset.index);
            if (eventIndex > -1) {
                replacementEvents.splice(eventIndex, 1);
                renderReplacementCards();
                updateRosterDisplay();
            }
        });

        card.appendChild(dateElem);
        card.appendChild(detailsElem);
        card.appendChild(changerElem);
        card.appendChild(revertButton);

        replacementRecordsContainer.appendChild(card);
    });
}

// --- LLM Integration Functions ---
async function generateHandoverNotes(date, shift, personOnCall) {
    notesLoadingIndicator.classList.remove('hidden');
    notesOutput.textContent = ''; // Clear previous output

    const prompt = `Generate brief, professional handover notes for an on-call shift. The shift is ${shift} on ${date} and the person on call is ${personOnCall}. Focus on general best practices for this type of shift and any common considerations for a team on-call. Do not include specific incident details as this is a generic template.`;

    let chatHistory = [];
    chatHistory.push({ role: "user", parts: [{ text: prompt }] });
    const payload = { contents: chatHistory };
    const apiKey = ""; // If you want to use models other than gemini-2.0-flash or imagen-3.0-generate-002, provide an API key here. Otherwise, leave this as-is.
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();

        if (result.candidates && result.candidates.length > 0 &&
            result.candidates[0].content && result.candidates[0].content.parts &&
            result.candidates[0].content.parts.length > 0) {
            const text = result.candidates[0].content.parts[0].text;
            notesOutput.textContent = text;
        } else {
            notesOutput.textContent = "Could not generate notes. Unexpected API response.";
            console.error("Unexpected API response structure:", result);
        }
    } catch (error) {
        notesOutput.textContent = "Error generating notes. Please try again later.";
        console.error("Error calling Gemini API:", error);
    } finally {
        notesLoadingIndicator.classList.add('hidden');
    }
}
// --- End LLM Integration Functions ---


// Event Listeners for navigation buttons
prevWeekBtn.addEventListener('click', () => {
    currentWeekStart.setDate(currentWeekStart.getDate() - 7);
    updateRosterDisplay();
});

nextWeekBtn.addEventListener('click', () => {
    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    updateRosterDisplay();
});

// Event Listeners for admin login
adminLoginBtn.addEventListener('click', openLoginModal);
closeLoginModalBtn.addEventListener('click', closeLoginModal);
cancelLoginBtn.addEventListener('click', closeLoginModal);

loginForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = adminNameSelect.value;
    const password = adminPasswordInput.value;

    if (name && password === ADMIN_PASSWORD) {
        isAuthenticated = true;
        loggedInUserName = name;
        closeLoginModal();
        adminLoginBtn.classList.add('hidden');
        recordReplacementBtn.disabled = false;
        // generateNotesBtn.disabled = false; // This button doesn't exist in the HTML
        updateRosterDisplay();
    } else {
        loginError.classList.remove('hidden');
    }
});

// Event Listener for "Record Replacement" button (now only opens if authenticated)
recordReplacementBtn.addEventListener('click', openReplacementModal);
closeReplacementModalBtn.addEventListener('click', closeReplacementModal);
cancelReplacementFormBtn.addEventListener('click', closeReplacementModal);

// Event listener for replacement type radio buttons
replacementTypeRadios.forEach(radio => {
    radio.addEventListener('change', toggleReplacementFields);
});

// Handle form submission for replacement
replacementForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const replacementDate = replacementDateInput.value;
    const originalPerson = originalPersonSelect.value;
    const replacementPerson = replacementPersonSelect.value;
    const changerName = changerNameInput.value;
    const replacementType = document.querySelector('input[name="replacementType"]:checked').value;

    let shift = null;
    let startTime = null;
    let endTime = null;
    let crossesMidnight = false;

    if (replacementType === 'full-shift') {
        shift = replacementShiftSelect.value;
        if (!shift) {
            console.error("Please select a shift for full-shift replacement.");
            return;
        }
    } else {
        startTime = replacementStartTimeInput.value;
        endTime = replacementEndTimeInput.value;

        if (!startTime || !endTime) {
            console.error("Please enter both start and end times for specific time replacement.");
            return;
        }

        const startMinutes = parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1]);
        const endMinutes = parseInt(endTime.split(':')[0]) * 60 + parseInt(endTime.split(':')[1]);

        if (endMinutes <= startMinutes) {
            if (!confirm("The end time is before or the same as the start time. This will be treated as crossing midnight. Continue?")) {
                timeError.classList.remove('hidden');
                return;
            }
            crossesMidnight = true;
        }
        timeError.classList.add('hidden');
    }


    if (!replacementDate || !originalPerson || !replacementPerson || !changerName) {
        console.error("Please fill all required fields.");
        return;
    }

    replacementEvents.push({
        date: replacementDate,
        type: replacementType,
        shift: shift,
        startTime: startTime,
        endTime: endTime,
        crossesMidnight: crossesMidnight,
        original: originalPerson,
        replacement: replacementPerson,
        changer: changerName,
        timestamp: new Date().toISOString()
    });

    renderReplacementCards();
    updateRosterDisplay();
    closeReplacementModal();
});

// Initial display of the current week's roster and replacement cards when the page loads
document.addEventListener('DOMContentLoaded', () => {
    updateRosterDisplay();
    toggleReplacementFields();
    recordReplacementBtn.disabled = true;
    setInterval(updateRosterDisplay, 60 * 1000);
});
