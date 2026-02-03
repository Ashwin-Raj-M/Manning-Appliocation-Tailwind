let tokenSet = null;
let employeeMap = null;

/**
 * Load employees.json and build fast lookup structures
 */
export async function loadEmployeeIndex() {
  if (tokenSet && employeeMap) return;

  const res = await fetch("../../shared/employees.json");
  const employees = await res.json();

  tokenSet = new Set();
  employeeMap = new Map();

  employees.forEach(emp => {
    const token = String(emp["T.NO"]).trim();
    tokenSet.add(token);
    employeeMap.set(token, emp);
  });
}

/**
 * Validate token existence
 */
export function isValidToken(token) {
  if (!tokenSet) return false;
  return tokenSet.has(String(token));
}

/**
 * (Optional) Get full employee details
 */
export function getEmployeeByToken(token) {
  if (!employeeMap) return null;
  return employeeMap.get(String(token)) || null;
}

