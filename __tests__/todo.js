const request = require("supertest");
const cheerio = require("cheerio");

const db = require("../models/index");
const app = require("../app");

let server, agent;

const extractCsrfToken = (res) => {
  const $ = cheerio.load(res.text);
  return $("[name=_csrf]").val();
};

describe("List the todo items", function () {
  beforeAll(async () => {
    await db.sequelize.sync({ force: true });
    server = app.listen(4000, () => {});
    agent = request.agent(server);
  });

  afterAll(async () => {
    await db.sequelize.close();
    server.close();
  });

  test("create a new todo", async () => {
    const res = await agent.get("/");
    const csrfToken = extractCsrfToken(res);
    const response = await agent.post("/todos").send({
      title: "Buy milk",
      dueDate: new Date().toISOString(),
      completed: false,
      _csrf: csrfToken,
    });
    expect(response.statusCode).toBe(302);
  });

  test("Mark a todo as complete", async () => {
    let res = await agent.get("/");
    let csrfToken = extractCsrfToken(res);

    await agent.post("/todos").send({
      title: "Buy milk",
      dueDate: new Date().toISOString(),
      completed: false,
      _csrf: csrfToken,
    });

    const groupedTodosResponse = await agent
      .get("/")
      .set("Accept", "application/json");
    const parsedGroupedResponse = JSON.parse(groupedTodosResponse.text);
    const dueTodayCount = parsedGroupedResponse.dueToday.length;
    const latestTodo = parsedGroupedResponse.dueToday[dueTodayCount - 1];

    res = await agent.get("/");
    csrfToken = extractCsrfToken(res);

    const markCompleteResponse = await agent
      .put(`/todos/${latestTodo.id}/setCompletionStatus`)
      .send({ _csrf: csrfToken });
    const parsedUpdateResponse = JSON.parse(markCompleteResponse.text);
    expect(parsedUpdateResponse.completed).toBe(true);
  });

  test("Mark a todo as incomplete", async () => {
    let res = await agent.get("/");
    let csrfToken = extractCsrfToken(res);

    await agent.post("/todos").send({
      title: "Buy milk",
      dueDate: new Date().toISOString(),
      completed: false,
      _csrf: csrfToken,
    });

    const groupedTodosResponse = await agent
      .get("/")
      .set("Accept", "application/json");
    const parsedGroupedResponse = JSON.parse(groupedTodosResponse.text);
    const dueTodayCount = parsedGroupedResponse.dueToday.length;
    const latestTodo = parsedGroupedResponse.dueToday[dueTodayCount - 1];

    res = await agent.get("/");
    csrfToken = extractCsrfToken(res);

    const markCompleteResponse = await agent
      .put(`/todos/${latestTodo.id}/setCompletionStatus`)
      .send({ _csrf: csrfToken });
    const parsedUpdateResponse = JSON.parse(markCompleteResponse.text);
    expect(parsedUpdateResponse.completed).toBe(true);

    const groupedTodosResponse2 = await agent
      .get("/")
      .set("Accept", "application/json");
    const parsedGroupedResponse2 = JSON.parse(groupedTodosResponse2.text);
    const completedCount = parsedGroupedResponse2.completed.length;
    const latestCompletedTodo =
      parsedGroupedResponse2.completed[completedCount - 1];

    res = await agent.get("/");
    csrfToken = extractCsrfToken(res);

    const markInCompleteResponse = await agent
      .put(`/todos/${latestCompletedTodo.id}/setCompletionStatus`)
      .send({ _csrf: csrfToken });
    const parsedUpdateResponse2 = JSON.parse(markInCompleteResponse.text);
    expect(parsedUpdateResponse2.completed).toBe(false);
  });

  /*   test("Should delete the todo", async () => {
    const response = await agent.post("/todos").send({
      title: "Try ELM",
      dueDate: new Date().toISOString(),
      completed: false,
    });
    const parsedResponse = JSON.parse(response.text);
    const todoID = parsedResponse.id;

    const deleteResponse = await agent.delete(`/todos/${todoID}`);
    const parsedDeleteResponse = JSON.parse(deleteResponse.text);
    expect(parsedDeleteResponse).toBe(true);

    const deleteResponseForNonExistedTodo = await agent.delete(
      `/todos/${9999}`
    );
    const parsedDeleteResponseForNonExistedTodo = JSON.parse(
      deleteResponseForNonExistedTodo.text
    );
    expect(parsedDeleteResponseForNonExistedTodo).toBe(false);
  }); */
});
