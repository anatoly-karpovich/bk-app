function createBotanLayout() {
  return `
  <div>
    <div>
      <label for="inputFromBotan" class="form-label">Input for question</label>
      <div class="d-flex justify-content-between col-md-5 mb-2">
        <input type="text"  class="form-control me-3" placeholder="Enter question" id="inputFromBotan">
        <button class="btn btn-secondary">Clear</button>
      </div>
      
    </div>
    <button class="btn btn-primary" type="submit" id="replace-latin-btn" style="margin-bottom: 20px">Replace letters!</button>
    <br />
    <div>
      <label for="outputForBotan" class="form-label">Output for question</label>
      <div class="d-flex justify-content-between col-md-5">
        <input type="text" class="form-control me-3" placeholder="Result" id="outputForBotan">
        <button class="btn btn-secondary">Copy</button>
      </div>
    </div>
  </div>`;
}

function addEventListenersToBotanPage() {
  const input = document.getElementById("inputFromBotan");
  const output = document.getElementById("outputForBotan");
  const btn = document.getElementById("replace-latin-btn");

  function replaceLatinLetters() {
    const value = input.value.includes("вопрос: ") ? input.value.split("вопрос: ")[1] : input.value;

    return value
      .toLowerCase()
      .replaceAll("a", "а")
      .replaceAll("e", "е")
      .replaceAll("y", "у")
      .replaceAll("u", "и")
      .replaceAll("o", "о")
      .replaceAll("t", "т")
      .replaceAll("p", "р")
      .replaceAll("k", "к")
      .replaceAll("x", "х")
      .replaceAll("c", "с")
      .replaceAll("b", "в")
      .replaceAll("n", "п")
      .replaceAll("u", "и");
  }

  function replaceLettersCallback() {
    const value = replaceLatinLetters();
    output.value = value;
    copyToClipboard(value);
    input.value = "";
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(value)}`;
    // Open the URL in a new tab
    window.open(searchUrl, "_blank");
  }

  btn.addEventListener("click", (event) => {
    event.preventDefault();
    replaceLettersCallback();
  });

  input.addEventListener("keypress", (event) => {
    event.preventDefault();
    if (event.key === "Enter") {
      replaceLettersCallback();
    }
  });
}
