function createQuizPageLayout() {
  return `
  <div style="width: auto; margin-bottom: 50px;" id="header">
    <div class="mb-3">
      <label for="numberOfQuestions" class="form-label">Number of quiz questions</label>
      <input type="number" class="form-control" placeholder="Enter number of questions" id="numberOfQuestions">
    </div>
    <div class="mb-3">
      <label for="quastionPrize" class="form-label">Prize per question</label>
      <input type="number" class="form-control" placeholder="Enter prize for one question" id="quastionPrize">
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
  const questionPrize = document.getElementById("quastionPrize");
  const textarea = document.getElementById("report");
  const receipts = document.getElementById("receipts");
  const reportButton = document.getElementById("generate-report-btn");
  const startButton = document.getElementById("startBtn");
  nickname.value = document.querySelector("strong#dj-name").textContent;

  numberOfQuestions.value = 10;
  questionPrize.value = 10;

  function removeDuplicates(arr) {
    return [...new Set(arr)];
  }

  function getNumberOfPlayers(obj) {
    return Object.keys(obj).length;
  }

  function getFullBank(obj) {
    return Object.values(obj).length ? Object.values(obj).reduce((a, b) => a + b) : 0;
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
    const questionPrize = state.quiz.questionPrize;
    let result = "";
    const questionsAmount = numberOfQuestions.value;
    for (let i = +questionsAmount * questionPrize; i > 0; i -= questionPrize) {
      const winners = Object.entries(obj).filter((pair) => pair[1] === i);
      if (winners.length) {
        result += `${i} екр выиграли:\n${winners.map((pair) => pair[0]).join("\n")}\n\n`;
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
    const questionPrize = state.quiz.questionPrize;
    let questionWinnersArray = getDataArrayFromTextareas().map((el) => {
      return removeDuplicates(el.map((nickname) => nickname.trim()));
    });
    return questionWinnersArray.flat().reduce((res, el) => {
      res[el] ? (res[el] += questionPrize) : (res[el] = questionPrize);
      return res;
    }, {});
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
    const questionPrize = +document.getElementById("quastionPrize").value;
    state.quiz.questionPrize = questionPrize;
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
