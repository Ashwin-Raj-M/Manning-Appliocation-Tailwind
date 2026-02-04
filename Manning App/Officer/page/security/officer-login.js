const users = ["xxxx", "yyyy"];

document.getElementById("loginBtn").onclick = () => {
  const name = username.value.trim();
  const pass = password.value.trim();

  if (!users.includes(name) || pass !== name) {
    alert("Invalid login");
    return;
  }

  localStorage.setItem("SECURITY_AUTH", JSON.stringify({
    name,
    loginAt: new Date().toISOString()
  }));

  location.href = "officer-landing.html";
};
