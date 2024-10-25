const mysqlForm = document.getElementById('mysqlForm');
const saveButton = document.getElementById('saveButton');

mysqlForm.addEventListener('submit', function(event) {
  // Prevent the default form submission behavior
  event.preventDefault();

  // Check if all the required fields are filled
  const inputs = mysqlForm.querySelectorAll('input[required]');
  let allFilled = true;

  inputs.forEach(input => {
    if (!input.value) {
      allFilled = false;
    }
  });

  if (allFilled) {
    // Show success feedback if all fields are filled
    saveButton.textContent = 'Saved!';
    saveButton.classList.add('success');

    // Optionally, reset the form and revert button after 3 seconds
    setTimeout(() => {
      saveButton.textContent = 'Save';
      saveButton.classList.remove('success');
      
      // Submit the form programmatically
      mysqlForm.submit();
    }, 2000);
  } else {
    // If any field is empty, show an alert or feedback
    alert('Please fill out all required fields.');
  }
});
