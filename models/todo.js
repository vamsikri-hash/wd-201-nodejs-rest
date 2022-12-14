"use strict";
const { Model, Op } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Todo extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    // eslint-disable-next-line no-unused-vars
    static associate(models) {
      // define association here
      Todo.belongsTo(models.User, {
        foreignKey: "userId",
      });
    }

    static addTodo({ title, dueDate, userId }) {
      return this.create({
        title: title,
        dueDate: dueDate,
        completed: false,
        userId,
      });
    }

    static getAllTodos() {
      return this.findAll({ order: [["id", "ASC"]] });
    }

    setCompletionStatus(status) {
      return this.update({ completed: status });
    }

    static async remove(id, userId) {
      return this.destroy({
        where: { id, userId },
      });
    }

    static async overdue(userId) {
      return await Todo.findAll({
        where: {
          dueDate: {
            [Op.lt]: new Date(),
          },
          completed: false,
          userId,
        },
        order: [["id", "ASC"]],
      });
    }

    static async dueToday(userId) {
      return await Todo.findAll({
        where: {
          dueDate: {
            [Op.eq]: new Date(),
          },
          completed: false,
          userId,
        },
        order: [["id", "ASC"]],
      });
    }

    static async dueLater(userId) {
      return await Todo.findAll({
        where: {
          dueDate: {
            [Op.gt]: new Date(),
          },
          completed: false,
          userId,
        },
        order: [["id", "ASC"]],
      });
    }

    static async completed(userId) {
      return await Todo.findAll({
        where: {
          completed: true,
          userId,
        },
        order: [["id", "ASC"]],
      });
    }
  }
  Todo.init(
    {
      title: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: { msg: "Title can not be empty" },
        },
      },
      dueDate: {
        type: DataTypes.DATEONLY,
        validate: {
          notEmpty: { msg: "Due Date can not be empty" },
        },
      },
      completed: { type: DataTypes.BOOLEAN, defaultValue: false },
    },
    {
      sequelize,
      modelName: "Todo",
    }
  );
  return Todo;
};
