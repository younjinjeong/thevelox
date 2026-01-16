import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';

describe('UsersService', () => {
  let service: UsersService;
  let model: Model<UserDocument>;

  const mockUser = {
    _id: 'user_123',
    name: 'testuser',
    username: 'testuser',
    email: 'test@example.com',
    password: 'hashedPassword',
    locale: 'en-US',
    status: 1,
    availableSize: 100 * 1024 * 1024 * 1024,
    usedSize: 0,
    createDate: new Date(),
    roles: ['user'],
    save: jest.fn().mockResolvedValue(this),
  };

  const mockUserModel = {
    new: jest.fn().mockResolvedValue(mockUser),
    constructor: jest.fn().mockResolvedValue(mockUser),
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    countDocuments: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    exec: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    model = module.get<Model<UserDocument>>(getModelToken(User.name));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createUserDto: CreateUserDto = {
      name: 'newuser',
      email: 'new@example.com',
      password: 'password123',
      locale: 'en-US',
    };

    it('should successfully create a user', async () => {
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      jest.spyOn(bcrypt, 'hash').mockImplementation(() => Promise.resolve('hashedPassword'));

      const mockSave = jest.fn().mockResolvedValue(mockUser);
      const mockUserInstance = {
        ...mockUser,
        save: mockSave,
      };

      jest.spyOn(model, 'constructor' as any).mockReturnValue(mockUserInstance);
      // Mock the model constructor
      (model as any).mockImplementation(() => mockUserInstance);

      const result = await service.create(createUserDto);

      expect(mockUserModel.findOne).toHaveBeenCalledWith({
        $or: [{ name: createUserDto.name }, { email: createUserDto.email }],
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(createUserDto.password, 12);
    });

    it('should throw ConflictException if user already exists', async () => {
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      await expect(service.create(createUserDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return paginated users', async () => {
      const mockUsers = [mockUser];
      mockUserModel.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockUsers),
      });
      mockUserModel.countDocuments.mockResolvedValue(1);

      const result = await service.findAll(1, 50);

      expect(result).toEqual({ users: mockUsers, total: 1 });
      expect(mockUserModel.find).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return a user by id', async () => {
      mockUserModel.findById.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      const result = await service.findById('user_123');

      expect(result).toEqual(mockUser);
      expect(mockUserModel.findById).toHaveBeenCalledWith('user_123');
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserModel.findById.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByUsername', () => {
    it('should return a user by username', async () => {
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      const result = await service.findByUsername('testuser');

      expect(result).toEqual(mockUser);
      expect(mockUserModel.findOne).toHaveBeenCalledWith({ name: 'testuser' });
    });
  });

  describe('findByEmail', () => {
    it('should return a user by email', async () => {
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      const result = await service.findByEmail('test@example.com');

      expect(result).toEqual(mockUser);
      expect(mockUserModel.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
    });
  });

  describe('update', () => {
    it('should update and return user', async () => {
      const updateDto = { username: 'updateduser' };
      mockUserModel.findByIdAndUpdate.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({ ...mockUser, ...updateDto }),
      });

      const result = await service.update('user_123', updateDto);

      expect(result.username).toBe('updateduser');
      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith('user_123', updateDto, { new: true });
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserModel.findByIdAndUpdate.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.update('nonexistent', {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('changePassword', () => {
    it('should successfully change password', async () => {
      const mockUserDoc = {
        ...mockUser,
        save: jest.fn().mockResolvedValue(mockUser),
      };

      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUserDoc),
      });

      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(true));
      jest.spyOn(bcrypt, 'hash').mockImplementation(() => Promise.resolve('newHashedPassword'));

      await service.changePassword('user_123', 'oldPassword', 'newPassword');

      expect(bcrypt.compare).toHaveBeenCalledWith('oldPassword', mockUser.password);
      expect(bcrypt.hash).toHaveBeenCalledWith('newPassword', 12);
      expect(mockUserDoc.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if current password is incorrect', async () => {
      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(false));

      await expect(service.changePassword('user_123', 'wrongPassword', 'newPassword')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('hasSpace', () => {
    it('should return true if user has enough space', async () => {
      mockUserModel.findById.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({
          usedSize: 1024,
          availableSize: 10240,
        }),
      });

      const result = await service.hasSpace('user_123', 5000);

      expect(result).toBe(true);
    });

    it('should return false if user does not have enough space', async () => {
      mockUserModel.findById.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({
          usedSize: 9000,
          availableSize: 10240,
        }),
      });

      const result = await service.hasSpace('user_123', 5000);

      expect(result).toBe(false);
    });
  });

  describe('getStorageStats', () => {
    it('should return storage statistics', async () => {
      mockUserModel.findById.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({
          usedSize: 50 * 1024 * 1024 * 1024, // 50GB
          availableSize: 100 * 1024 * 1024 * 1024, // 100GB
        }),
      });

      const result = await service.getStorageStats('user_123');

      expect(result.used).toBe(50 * 1024 * 1024 * 1024);
      expect(result.available).toBe(100 * 1024 * 1024 * 1024);
      expect(result.remaining).toBe(50 * 1024 * 1024 * 1024);
      expect(result.usedPercentage).toBe(50);
    });
  });

  describe('softDelete', () => {
    it('should soft delete a user', async () => {
      mockUserModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      await service.softDelete('user_123');

      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith('user_123', { status: 2 });
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.softDelete('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
