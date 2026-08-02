import type { Request, Response } from "express";
import { parseRequest } from "../../common/validation/parseRequest";
import { UsersService } from "./UsersService";
import { createUserSchema, resetPasswordSchema, updateUserSchema, userIdParamsSchema, usersListQuerySchema } from "./users.schemas";

export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  listUsers = async (req: Request, res: Response) => {
    const query = parseRequest(usersListQuerySchema, req.query, "Invalid users query");
    const result = await this.usersService.listUsers(query);
    return res.status(200).json({ success: true, data: result });
  };

  getUser = async (req: Request, res: Response) => {
    const { userId } = parseRequest(userIdParamsSchema, req.params, "Invalid user id");
    return res.status(200).json({ success: true, data: { user: await this.usersService.getUser(userId) } });
  };

  createUser = async (req: Request, res: Response) => {
    const input = parseRequest(createUserSchema, req.body, "Invalid user input");
    const user = await this.usersService.createUser(req.authUser!, input);
    return res.status(201).json({ success: true, data: { user } });
  };

  updateUser = async (req: Request, res: Response) => {
    const { userId } = parseRequest(userIdParamsSchema, req.params, "Invalid user id");
    const input = parseRequest(updateUserSchema, req.body, "Invalid user input");
    return res.status(200).json({ success: true, data: { user: await this.usersService.updateUser(req.authUser!, userId, input) } });
  };

  blockUser = async (req: Request, res: Response) => {
    const { userId } = parseRequest(userIdParamsSchema, req.params, "Invalid user id");
    await this.usersService.blockUser(req.authUser!, userId);
    return res.status(204).send();
  };

  unblockUser = async (req: Request, res: Response) => {
    const { userId } = parseRequest(userIdParamsSchema, req.params, "Invalid user id");
    await this.usersService.unblockUser(req.authUser!, userId);
    return res.status(204).send();
  };

  resetPassword = async (req: Request, res: Response) => {
    const { userId } = parseRequest(userIdParamsSchema, req.params, "Invalid user id");
    const input = parseRequest(resetPasswordSchema, req.body, "Invalid password input");
    await this.usersService.resetPassword(req.authUser!, userId, input.password);
    return res.status(204).send();
  };
}
