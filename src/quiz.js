function createQuizPageLayout() {
  return `
  <div style="width: auto; margin-bottom: 50px;" id="header">
    <div class="mb-3">
      <label for="numberOfQuestions" class="form-label">Number of quiz questions</label>
      <input type="number" class="form-control" placeholder="Enter number of questions" id="numberOfQuestions">
    </div>
    <div class="mb-3">
      <label for="nickname" class="form-label">DJ's nickname</label>
      <input type="text" class="form-control" placeholder="Enter your nickname" id="nickname">
      <div class="invalid-feedback" id="error-nick">Nickname must be 1 character or longer</div>
    </div>
    <br>
    <button class="btn btn-primary" id="startBtn">Start</button>
  </div>
  <div id="container" style="display: none;">
    <div id="questions"> 
    </div>
    <button class="btn btn-primary" id="generate-report-btn" style="margin-bottom: 20px;">Generate report</button>
    <br>
    <div>
      <label for="report" class="form-label">Generated Report</label>
      <textarea class="form-control mb-5" id="report" placeholder="Quiz report" rows="25"
        style="width: 100%;"></textarea>
    </div>
    <div>
      <label for="receipts" class="form-label">Checks amount</label>
      <textarea class="form-control mb-5" id="receipts" placeholder="Checks to buy" rows="6"
        style="width: 100%;"></textarea>
    </div>
  </div>
`;
}

function addEventListenersToQuizPage() {
  const numberOfQuestions = document.getElementById("numberOfQuestions");
  const nickname = document.getElementById("nickname");
  const questionsContainer = document.getElementById("questions");
  const textarea = document.getElementById("report");
  const receipts = document.getElementById("receipts");
  const reportButton = document.getElementById("generate-report-btn");
  const startButton = document.getElementById("startBtn");

  numberOfQuestions.value = 10;

  function removeDuplicates(arr) {
    return [...new Set(arr)];
  }

  function getNumberOfPlayers(obj) {
    return Object.keys(obj).length;
  }

  function getFullBank(obj) {
    return Object.values(obj).length ? Object.values(obj).reduce((a, b) => a + b) * 10 : 0;
  }

  function getNickNamesFromChatMessages(text, dj) {
    const nickNames = [];
    let isNickNamesChar = false;
    let nick = "";
    for (const char of text) {
      if (char === "[") {
        isNickNamesChar = true;
        nick = "";
        continue;
      } else if (char === "]") {
        isNickNamesChar = false;
        if (nick.includes(",")) {
          continue;
        }
        if (nick.trim() !== dj.trim()) {
          nickNames.push(nick.trim());
        }
      }

      if (isNickNamesChar) {
        nick += char;
      }
    }
    return nickNames;
  }

  function calculateReceipts(obj) {
    const result = {
      100: 0,
      50: 0,
      20: 0,
      10: 0,
      5: 0,
      1: 0,
    };

    Object.values(obj).forEach((el) => {
      let value = el * 10;
      while (value - 100 >= 0) {
        result[100]++;
        value = value - 100;
      }
      while (value - 50 >= 0) {
        result[50]++;
        value = value - 50;
      }
      while (value - 20 >= 0) {
        result[20]++;
        value = value - 20;
      }
      while (value - 10 >= 0) {
        result[10]++;
        value = value - 10;
      }
      while (value - 5 >= 0) {
        result[5]++;
        value = value - 5;
      }
      while (value - 1 >= 0) {
        result[1]++;
        value = value - 1;
      }
    });
    return result;
  }

  const generateQuestionWithTextarea = (number) => `
    <label for="input${number}" class="form-label">Question ${number} winners</label>
    <textarea class="form-control" type="text" id="input${number}" rows="10" placeholder="Enter ${number} question winners devided by comma" style="width: 100%; margin-bottom: 20px;"></textarea>
    <br />`;

  function generateQuestionInputs(numberOfQuestions) {
    let result = "";
    for (let i = 1; i <= numberOfQuestions; i++) {
      result += generateQuestionWithTextarea(i);
    }
    return result;
  }

  function getReportSortedByWinningsAmount(obj) {
    console.log(obj);
    let result = "";
    const questionsAmount = numberOfQuestions.value;
    for (let i = +questionsAmount; i > 0; i--) {
      const winners = Object.entries(obj).filter((pair) => pair[1] === i);
      if (winners.length) {
        result += `${i * 10} екр выиграли:\n${winners.map((pair) => pair[0]).join("\n")}\n\n`;
      }
    }
    return result;
  }

  function getDataArrayFromTextareas() {
    const dj = nickname.value;
    const questionWinnersArray = [...document.querySelectorAll("#questions textarea")].map((i) => getNickNamesFromChatMessages(i.value, dj)).filter((i) => i.length);
    return questionWinnersArray;
  }

  function getObjectWithAnswersAmount() {
    let questionWinnersArray = getDataArrayFromTextareas().map((el) => {
      return removeDuplicates(el.map((nickname) => nickname.trim()));
    });
    return questionWinnersArray.flat().reduce((res, el) => {
      res[el] ? res[el]++ : (res[el] = 1);
      return res;
    }, {});
  }

  function generateReceiptsReport(obj) {
    return Object.keys(obj).reduce((a, b) => {
      a += `Чеки по ${b} екр: ${obj[b]} штук\n`;
      return a;
    }, "");
  }

  reportButton.addEventListener("click", (event) => {
    event.preventDefault();
    let results = getObjectWithAnswersAmount();
    const report = getReportSortedByWinningsAmount(results) + `Всего приняло участие: ${getNumberOfPlayers(results)} игроков` + "\n" + `Общая сумма выигрыша составила: ${getFullBank(results)} екр`;
    const receiptsAmount = calculateReceipts(results);
    textarea.value = report;
    receipts.value = generateReceiptsReport(receiptsAmount);
  });

  startButton.addEventListener("click", (event) => {
    event.preventDefault();
    const questionsAmount = numberOfQuestions.value;
    if (questionsAmount) {
      const questionsHtml = generateQuestionInputs(questionsAmount);
      questionsContainer.innerHTML = questionsHtml;
      document.querySelector("#container").style.display = "block";
    }
  });

  nickname.addEventListener("input", (event) => {
    const nick = nickname.value;
    if (!isValidNickname(nick)) {
      nickname.classList.add("is-invalid");
      startButton.setAttribute("disabled", "");
      document.querySelector("#container").style.display = "none";
    } else {
      nickname.classList.remove("is-invalid");
      startButton.removeAttribute("disabled");
    }
  });

  function isValidNickname(nickname) {
    return nickname.length > 0;
  }
}
