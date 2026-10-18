const updateCount = () => {
  const host = document.querySelector('#selection-count');
  if (host) host.textContent = document.querySelectorAll('input:checked').length + ' selected';
};
document.querySelectorAll('input[type=checkbox]').forEach(input => input.addEventListener('change', updateCount));
updateCount();
document.querySelector('#list').onclick = () => {
  const paths = [...document.querySelectorAll('input:checked')].map(input => input.value);
  const newline = String.fromCharCode(10);
  document.querySelector('#approval').value = paths.length
    ? 'Approve replacement of only these exact PNG paths from the reviewed candidates:' + newline + paths.join(newline)
    : 'No paths selected.';
};
