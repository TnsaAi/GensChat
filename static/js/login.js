document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const userNameInput = document.getElementById('userName');
    const dobInput = document.getElementById('dob');
    const betaCodeInput = document.getElementById('betaCode');
    const loginError = document.getElementById('loginError');

    // Redirect to chat if already logged in and verified
    if (localStorage.getItem('ngen3_access_token') && 
        localStorage.getItem('ngen3_user_name') && 
        localStorage.getItem('ngen3_is_adult') === 'true') {
        window.location.href = '/'; // Redirect to chat page (index.html)
        return; // Stop further execution of login.js
    }

    loginForm.addEventListener('submit', (event) => {
        event.preventDefault();
        loginError.textContent = ''; // Clear previous errors

        const userName = userNameInput.value.trim();
        const dobString = dobInput.value;
        const betaCode = betaCodeInput.value.trim();

        if (!userName || !dobString || !betaCode) {
            loginError.textContent = 'All fields are required.';
            return;
        }

        // Age verification (must be 18 or older)
        const dob = new Date(dobString);
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const monthDiff = today.getMonth() - dob.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
            age--;
        }

        if (age < 18) {
            loginError.textContent = 'You must be 18 years or older to use this application.';
            return;
        }

        // If all checks pass, store the data and redirect
        localStorage.setItem('ngen3_user_name', userName);
        localStorage.setItem('ngen3_access_token', betaCode); // This is the beta code
        localStorage.setItem('ngen3_dob_string', dobString); // Store for reference if needed
        localStorage.setItem('ngen3_is_adult', 'true');
        
        // Redirect to the main chat page
        window.location.href = '/'; // Assuming index.html is at the root
    });
}); 