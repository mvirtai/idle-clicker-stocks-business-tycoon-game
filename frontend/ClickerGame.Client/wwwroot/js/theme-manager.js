// Theme Manager with Day-Night Cycle (Light / Dusk / Dark / Auto)
// "From Gigs to Giants"
(function() {
    const THEME_MODE_KEY = 'clicker_app_theme_mode'; // 'auto', 'light', 'dusk', 'dark'

    let themeMode = localStorage.getItem(THEME_MODE_KEY) || 'auto';
    let currentEffectiveTheme = 'dark';
    let currentHour = 9;
    let currentMinute = 0;

    function determineThemeForTime(hour) {
        if (hour >= 7 && hour < 16) {
            return 'light'; // Solar Daylight Studio
        } else if (hour >= 16 && hour < 21) {
            return 'dusk';  // Twilight / Golden Hour Sunset
        } else {
            return 'dark';  // Cyberpunk Midnight Neon
        }
    }

    function applyEffectiveTheme(theme, hour, minute) {
        currentEffectiveTheme = theme;
        const root = document.documentElement;
        const body = document.body;

        // Clean existing theme classes
        root.classList.remove('light', 'dusk', 'dark');
        if (body) {
            body.classList.remove('light', 'dusk', 'dark');
        }

        root.classList.add(theme);
        if (body) {
            body.classList.add(theme);
        }

        root.setAttribute('data-theme', theme);

        // Calculate continuous normalized day time (0.0 at midnight, 0.5 at noon)
        const totalMinutes = (hour * 60) + minute;
        const timeFraction = totalMinutes / 1440.0;
        root.style.setProperty('--day-time-fraction', timeFraction.toFixed(4));
        root.style.setProperty('--day-hour-val', (hour + minute / 60.0).toFixed(2));
    }

    function refreshTheme() {
        if (themeMode === 'auto') {
            const theme = determineThemeForTime(currentHour);
            applyEffectiveTheme(theme, currentHour, currentMinute);
        } else {
            applyEffectiveTheme(themeMode, currentHour, currentMinute);
        }
    }

    // Initialize early
    refreshTheme();

    window.ThemeManager = {
        getTheme: function() {
            return currentEffectiveTheme;
        },
        getThemeMode: function() {
            return themeMode;
        },
        setThemeMode: function(mode) {
            if (['auto', 'light', 'dusk', 'dark'].includes(mode)) {
                themeMode = mode;
                try {
                    localStorage.setItem(THEME_MODE_KEY, themeMode);
                } catch (e) {}
                refreshTheme();
            }
            return currentEffectiveTheme;
        },
        setTimeOfDay: function(hour, minute) {
            currentHour = Math.max(0, Math.min(23, hour));
            currentMinute = Math.max(0, Math.min(59, minute));
            refreshTheme();
            return {
                theme: currentEffectiveTheme,
                hour: currentHour,
                minute: currentMinute,
                mode: themeMode
            };
        },
        cycleNextTheme: function() {
            // Sequence: auto -> light -> dusk -> dark -> auto
            const sequence = ['auto', 'light', 'dusk', 'dark'];
            const nextIdx = (sequence.indexOf(themeMode) + 1) % sequence.length;
            this.setThemeMode(sequence[nextIdx]);
            return {
                theme: currentEffectiveTheme,
                mode: themeMode
            };
        },
        toggleTheme: function() {
            // Backwards-compatible toggle: switches between day, dusk, night
            if (currentEffectiveTheme === 'light') {
                this.setThemeMode('dusk');
            } else if (currentEffectiveTheme === 'dusk') {
                this.setThemeMode('dark');
            } else {
                this.setThemeMode('light');
            }
            return currentEffectiveTheme;
        }
    };
})();
