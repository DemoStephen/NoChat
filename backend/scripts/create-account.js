// line 61 to line 88. This code is for chnaging the icon icon when it is being clicked in the password input.
const setPassWordView = document.querySelector('[data-setPassWordView]')
const eye = document.querySelector('[data-eye]')
setPassWordView.addEventListener('change', (event) => {
    event.preventDefault()
    const passwordInput = document.getElementById('password');

    if (setPassWordView.checked) {
        eye.innerHTML = `

        <svg width="1.5rem" height="1.5rem" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 2L22 22" stroke="var(--Purple500)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M6.71277 6.7226C3.66479 8.79527 2 12 2 12C2 12 5.63636 19 12 19C14.0503 19 15.8174 18.2734 17.2711 17.2884M11 5.05822C11.3254 5.02013 11.6588 5 12 5C18.3636 5 22 12 22 12C22 12 21.3082 13.3317 20 14.8335" stroke="var(--Purple500)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M14 14.2362C13.4692 14.7112 12.7684 15.0001 12 15.0001C10.3431 15.0001 9 13.657 9 12.0001C9 11.1764 9.33193 10.4303 9.86932 9.88818" stroke="var(--Purple500)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        `
        passwordInput.setAttribute('type', 'text');
    } else {
        eye.innerHTML = `
        <svg width="1.5rem" height="1.5rem" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12" stroke="var(--Purple500)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M1 12C1 12 5 20 12 20C19 20 23 12 23 12" stroke="var(--Purple500)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            <circle cx="12" cy="12" r="3" stroke="var(--Purple500)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        `
        passwordInput.setAttribute('type', 'password');
    }
});
// line 61 to line 88. This code is for chnaging the icon icon when it is being clicked in the password input.

const create = document.querySelector('#account-form');
create.addEventListener('submit', async (e) => {
    e.stopImmediatePropagation();
    e.preventDefault();
    const email = document.getElementById('email').value;
    const username = document.getElementById('username').value;
    // Changed The password attribute from the (type: password) to (type : text). Dont know what you would do with this afterall
    const passwordInput = document.getElementById('password');  // This variable contains the value gotten from the user. Right here it hasnt been converted to text
    passwordInput.setAttribute('type', 'text'); // Here, I changed the password input back to text.

    const password = passwordInput.value //Here you go. You have gotten a value

    const phoneNumber = document.getElementById('phoneNumber').value;
    try {
        const response = await fetch('/create-account', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email,
                username,
                password,
                phoneNumber
            })
        });

        const data = await response.json();
        //console.log(data);
        alert(`${JSON.stringify(data)}`);
        // If created successfully, redirect to the login page
        if (response.status == 200) {
            setTimeout(async () => {
                window.location.href = '/public/login-page';
            }, 1000 * 1); // Return to the login page after 2 seconds
        }
    } catch (err) {
        console.log('An error occured:', err.message);
    }
});
