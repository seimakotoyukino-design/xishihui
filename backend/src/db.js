import { Sequelize, DataTypes } from 'sequelize';

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './wechat-login.sqlite',
  logging: false
});

export const User = sequelize.define(
  'User',
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true
    },
    openid: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true
    },
    unionid: {
      type: DataTypes.STRING(64),
      allowNull: true
    },
    sessionKeyHash: {
      type: DataTypes.STRING(128),
      allowNull: false
    },
    nickname: {
      type: DataTypes.STRING(64),
      allowNull: true,
      defaultValue: null
    },
    avatarUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null
    },
    lastLoginAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  },
  {
    tableName: 'users',
    underscored: true
  }
);

export async function initDb() {
  await sequelize.authenticate();
  await sequelize.sync();
}

export default sequelize;
