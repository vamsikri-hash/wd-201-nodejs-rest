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

  test("Should create a new todo", async () => {
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

  test("Should mark a todo as complete", async () => {
    let res = await agent.get("/");
    let csrfToken = extractCsrfToken(res);

    await agent.post("/todos").send({
      title: "Buy vegetables",
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
      .put(`/todos/${latestTodo.id}`)
      .send({ _csrf: csrfToken, id: latestTodo.id, completed: true });
    const parsedUpdateResponse = JSON.parse(markCompleteResponse.text);
    expect(parsedUpdateResponse.completed).toBe(true);
  });

  test("Should mark a todo as incomplete", async () => {
    let res = await agent.get("/");
    let csrfToken = extractCsrfToken(res);

    await agent.post("/todos").send({
      title: "Read book",
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

    // Mark todo as completed
    const markCompleteResponse = await agent
      .put(`/todos/${latestTodo.id}`)
      .send({ _csrf: csrfToken, id: latestTodo.id, completed: true });
    const parsedUpdateResponse = JSON.parse(markCompleteResponse.text);
    expect(parsedUpdateResponse.completed).toBe(true);

    const finalGroupedTodosResponse = await agent
      .get("/")
      .set("Accept", "application/json");
    const finalParsedGroupedResponse = JSON.parse(
      finalGroupedTodosResponse.text
    );
    const completedCount = finalParsedGroupedResponse.completed.length;
    const latestCompletedTodo =
      finalParsedGroupedResponse.completed[completedCount - 1];

    res = await agent.get("/");
    csrfToken = extractCsrfToken(res);

    // Mark same todo as incompleted
    const markInCompleteResponse = await agent
      .put(`/todos/${latestCompletedTodo.id}`)
      .send({ _csrf: csrfToken, id: latestCompletedTodo.id, completed: false });
    const finalParsedUpdatedResponse = JSON.parse(markInCompleteResponse.text);
    expect(finalParsedUpdatedResponse.completed).toBe(false);
  });

  test("Should delete the todo", async () => {
    let res = await agent.get("/");
    let csrfToken = extractCsrfToken(res);

    await agent.post("/todos").send({
      title: "Try ELM",
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

    const deleteResponse = await agent
      .delete(`/todos/${latestTodo.id}`)
      .send({ _csrf: csrfToken });
    const parsedDeleteResponse = JSON.parse(deleteResponse.text);
    expect(parsedDeleteResponse.success).toBe(true);
  });

  test("Should list all todos", async () => {
    const initialTodosResponse = await agent
      .get("/todos")
      .set("Accept", "application/json");
    const parsedInitialTodosResponse = JSON.parse(initialTodosResponse.text);

    let res = await agent.get("/");
    let csrfToken = extractCsrfToken(res);

    await agent.post("/todos").send({
      title: "Try Something",
      dueDate: new Date().toISOString(),
      completed: false,
      _csrf: csrfToken,
    });

    const finalTodosResponse = await agent
      .get("/todos")
      .set("Accept", "application/json");
    const parsedFinalTodosResponse = JSON.parse(finalTodosResponse.text);

    expect(parsedFinalTodosResponse.length).toBe(
      parsedInitialTodosResponse.length + 1
    );
  });

  test("Should get a todo", async () => {
    let res = await agent.get("/");
    let csrfToken = extractCsrfToken(res);

    await agent.post("/todos").send({
      title: "Try Anything",
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

    const actualTodoResponse = await agent
      .get(`/todos/${latestTodo.id}`)
      .set("Accept", "application/json");
    const parsedActualTodoResponse = JSON.parse(actualTodoResponse.text);

    expect(parsedActualTodoResponse.title).toBe("Try Anything");
  });
});
