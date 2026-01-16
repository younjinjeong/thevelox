import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { Model } from 'mongoose';
import { NotificationsService } from './notifications.service';
import { Notification, NotificationDocument, NotificationType } from './schemas/notification.schema';
import { RealtimeService } from '../realtime/realtime.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let model: Model<NotificationDocument>;
  let realtimeService: RealtimeService;

  const mockNotification = {
    _id: 'notif_123',
    userId: 'user_123',
    type: NotificationType.FILE_UPLOADED,
    title: 'Test Notification',
    message: 'Test message',
    read: false,
    createdAt: new Date(),
    save: jest.fn().mockResolvedValue(this),
  };

  const mockNotificationModel = {
    new: jest.fn().mockResolvedValue(mockNotification),
    constructor: jest.fn().mockResolvedValue(mockNotification),
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    findOneAndUpdate: jest.fn(),
    updateMany: jest.fn(),
    deleteOne: jest.fn(),
    deleteMany: jest.fn(),
    countDocuments: jest.fn(),
    exec: jest.fn(),
  };

  const mockRealtimeService = {
    sendNotification: jest.fn(),
    markNotificationAsRead: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: getModelToken(Notification.name),
          useValue: mockNotificationModel,
        },
        {
          provide: RealtimeService,
          useValue: mockRealtimeService,
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    model = module.get<Model<NotificationDocument>>(getModelToken(Notification.name));
    realtimeService = module.get<RealtimeService>(RealtimeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a notification and send real-time event', async () => {
      const createDto = {
        userId: 'user_123',
        type: NotificationType.FILE_UPLOADED,
        title: 'New File',
        message: 'File uploaded',
      };

      const mockSave = jest.fn().mockResolvedValue({
        ...mockNotification,
        ...createDto,
        _id: { toString: () => 'notif_123' },
        createdAt: new Date(),
      });

      const mockInstance = {
        ...mockNotification,
        ...createDto,
        save: mockSave,
        _id: { toString: () => 'notif_123' },
        createdAt: new Date(),
      };

      (model as any).mockImplementation(() => mockInstance);

      const result = await service.create(createDto);

      expect(mockSave).toHaveBeenCalled();
      expect(realtimeService.sendNotification).toHaveBeenCalledWith('user_123', expect.any(Object));
    });
  });

  describe('findByUser', () => {
    it('should return paginated notifications for a user', async () => {
      const mockNotifications = [mockNotification];
      mockNotificationModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockNotifications),
      });
      mockNotificationModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(1),
      });

      const result = await service.findByUser('user_123', { page: 1, limit: 20 });

      expect(result.notifications).toEqual(mockNotifications);
      expect(result.total).toBe(1);
      expect(mockNotificationModel.find).toHaveBeenCalledWith({ userId: 'user_123' });
    });

    it('should filter by read status', async () => {
      const mockNotifications = [mockNotification];
      mockNotificationModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockNotifications),
      });
      mockNotificationModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(1),
      });

      await service.findByUser('user_123', { page: 1, limit: 20, read: false });

      expect(mockNotificationModel.find).toHaveBeenCalledWith({ userId: 'user_123', read: false });
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const updatedNotification = { ...mockNotification, read: true };
      mockNotificationModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedNotification),
      });

      const result = await service.markAsRead('notif_123', 'user_123');

      expect(result.read).toBe(true);
      expect(mockNotificationModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'notif_123', userId: 'user_123' },
        { read: true, readAt: expect.any(Date) },
        { new: true },
      );
      expect(realtimeService.markNotificationAsRead).toHaveBeenCalledWith('user_123', 'notif_123');
    });

    it('should throw NotFoundException if notification not found', async () => {
      mockNotificationModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.markAsRead('nonexistent', 'user_123')).rejects.toThrow(NotFoundException);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all unread notifications as read', async () => {
      mockNotificationModel.updateMany.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ modifiedCount: 5 }),
      });

      const count = await service.markAllAsRead('user_123');

      expect(count).toBe(5);
      expect(mockNotificationModel.updateMany).toHaveBeenCalledWith(
        { userId: 'user_123', read: false },
        { read: true, readAt: expect.any(Date) },
      );
    });
  });

  describe('delete', () => {
    it('should delete a notification', async () => {
      mockNotificationModel.deleteOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount: 1 }),
      });

      await service.delete('notif_123', 'user_123');

      expect(mockNotificationModel.deleteOne).toHaveBeenCalledWith({ _id: 'notif_123', userId: 'user_123' });
    });

    it('should throw NotFoundException if notification not found', async () => {
      mockNotificationModel.deleteOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount: 0 }),
      });

      await expect(service.delete('nonexistent', 'user_123')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getStats', () => {
    it('should return notification statistics', async () => {
      mockNotificationModel.countDocuments.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(10),
      });
      mockNotificationModel.countDocuments.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(3),
      });
      mockNotificationModel.countDocuments.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(2),
      });

      const stats = await service.getStats('user_123');

      expect(stats.total).toBe(10);
      expect(stats.unread).toBe(3);
      expect(stats.read).toBe(7);
      expect(stats.recent).toBe(2);
    });
  });

  describe('notifyFileUploaded', () => {
    it('should create a file uploaded notification', async () => {
      const mockSave = jest.fn().mockResolvedValue({
        ...mockNotification,
        _id: { toString: () => 'notif_123' },
        createdAt: new Date(),
      });

      const mockInstance = {
        ...mockNotification,
        save: mockSave,
        _id: { toString: () => 'notif_123' },
        createdAt: new Date(),
      };

      (model as any).mockImplementation(() => mockInstance);

      await service.notifyFileUploaded('user_123', 'test.pdf', 'Project Files', 'John Doe', 'file_123', 'box_123');

      expect(mockSave).toHaveBeenCalled();
      expect(realtimeService.sendNotification).toHaveBeenCalled();
    });
  });

  describe('notifyBoxInvited', () => {
    it('should create a box invitation notification', async () => {
      const mockSave = jest.fn().mockResolvedValue({
        ...mockNotification,
        _id: { toString: () => 'notif_123' },
        createdAt: new Date(),
      });

      const mockInstance = {
        ...mockNotification,
        save: mockSave,
        _id: { toString: () => 'notif_123' },
        createdAt: new Date(),
      };

      (model as any).mockImplementation(() => mockInstance);

      await service.notifyBoxInvited('user_123', 'Project Box', 'Jane Doe', 'box_123');

      expect(mockSave).toHaveBeenCalled();
      expect(realtimeService.sendNotification).toHaveBeenCalled();
    });
  });

  describe('notifyQuotaWarning', () => {
    it('should create a quota warning notification', async () => {
      const mockSave = jest.fn().mockResolvedValue({
        ...mockNotification,
        _id: { toString: () => 'notif_123' },
        createdAt: new Date(),
      });

      const mockInstance = {
        ...mockNotification,
        save: mockSave,
        _id: { toString: () => 'notif_123' },
        createdAt: new Date(),
      };

      (model as any).mockImplementation(() => mockInstance);

      await service.notifyQuotaWarning('user_123', 85);

      expect(mockSave).toHaveBeenCalled();
      expect(realtimeService.sendNotification).toHaveBeenCalled();
    });
  });
});
