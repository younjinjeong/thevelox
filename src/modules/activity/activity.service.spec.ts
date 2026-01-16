import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ActivityService } from './activity.service';
import { Activity, ActivityDocument, ActivityType } from './schemas/activity.schema';

describe('ActivityService', () => {
  let service: ActivityService;
  let model: Model<ActivityDocument>;

  const mockActivity = {
    _id: 'activity_123',
    userId: 'user_123',
    userName: 'testuser',
    type: ActivityType.FILE_UPLOADED,
    description: 'Uploaded file test.pdf',
    timestamp: new Date(),
    save: jest.fn().mockResolvedValue(this),
  };

  const mockActivityModel = {
    new: jest.fn().mockResolvedValue(mockActivity),
    constructor: jest.fn().mockResolvedValue(mockActivity),
    find: jest.fn(),
    exec: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityService,
        {
          provide: getModelToken(Activity.name),
          useValue: mockActivityModel,
        },
      ],
    }).compile();

    service = module.get<ActivityService>(ActivityService);
    model = module.get<Model<ActivityDocument>>(getModelToken(Activity.name));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('log', () => {
    it('should log an activity', async () => {
      const activityData = {
        userId: 'user_123',
        userName: 'testuser',
        type: ActivityType.FILE_UPLOADED,
        description: 'Uploaded file test.pdf',
        fileId: 'file_123',
        fileName: 'test.pdf',
        boxId: 'box_123',
        boxName: 'Project Files',
      };

      const mockSave = jest.fn().mockResolvedValue(mockActivity);
      const mockInstance = {
        ...mockActivity,
        save: mockSave,
      };

      (model as any).mockImplementation(() => mockInstance);

      const result = await service.log(activityData);

      expect(mockSave).toHaveBeenCalled();
    });
  });

  describe('findByUser', () => {
    it('should return activities for a user', async () => {
      const mockActivities = [mockActivity];
      mockActivityModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockActivities),
      });

      const result = await service.findByUser('user_123', 50);

      expect(result).toEqual(mockActivities);
      expect(mockActivityModel.find).toHaveBeenCalledWith({ userId: 'user_123' });
    });
  });

  describe('findByBox', () => {
    it('should return activities for a box', async () => {
      const mockActivities = [mockActivity];
      mockActivityModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockActivities),
      });

      const result = await service.findByBox('box_123', 50);

      expect(result).toEqual(mockActivities);
      expect(mockActivityModel.find).toHaveBeenCalledWith({ boxId: 'box_123' });
    });
  });

  describe('findByFile', () => {
    it('should return activities for a file', async () => {
      const mockActivities = [mockActivity];
      mockActivityModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockActivities),
      });

      const result = await service.findByFile('file_123', 50);

      expect(result).toEqual(mockActivities);
      expect(mockActivityModel.find).toHaveBeenCalledWith({ fileId: 'file_123' });
    });
  });

  describe('findRecent', () => {
    it('should return recent activities across the system', async () => {
      const mockActivities = [mockActivity];
      mockActivityModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockActivities),
      });

      const result = await service.findRecent(100);

      expect(result).toEqual(mockActivities);
      expect(mockActivityModel.find).toHaveBeenCalledWith({});
    });
  });

  describe('findByType', () => {
    it('should return activities by type', async () => {
      const mockActivities = [mockActivity];
      mockActivityModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockActivities),
      });

      const result = await service.findByType(ActivityType.FILE_UPLOADED, 50);

      expect(result).toEqual(mockActivities);
      expect(mockActivityModel.find).toHaveBeenCalledWith({ type: ActivityType.FILE_UPLOADED });
    });
  });

  describe('Helper methods', () => {
    let logSpy: jest.SpyInstance;

    beforeEach(() => {
      const mockSave = jest.fn().mockResolvedValue(mockActivity);
      const mockInstance = {
        ...mockActivity,
        save: mockSave,
      };
      (model as any).mockImplementation(() => mockInstance);

      logSpy = jest.spyOn(service, 'log');
    });

    it('should log file uploaded activity', async () => {
      await service.logFileUploaded('user_123', 'testuser', 'file_123', 'test.pdf', 'box_123', 'Project Files');

      expect(logSpy).toHaveBeenCalledWith({
        userId: 'user_123',
        userName: 'testuser',
        type: ActivityType.FILE_UPLOADED,
        description: 'Uploaded file "test.pdf" to box "Project Files"',
        fileId: 'file_123',
        fileName: 'test.pdf',
        boxId: 'box_123',
        boxName: 'Project Files',
        metadata: undefined,
      });
    });

    it('should log file downloaded activity', async () => {
      await service.logFileDownloaded('user_123', 'testuser', 'file_123', 'test.pdf');

      expect(logSpy).toHaveBeenCalledWith({
        userId: 'user_123',
        userName: 'testuser',
        type: ActivityType.FILE_DOWNLOADED,
        description: 'Downloaded file "test.pdf"',
        fileId: 'file_123',
        fileName: 'test.pdf',
      });
    });

    it('should log box created activity', async () => {
      await service.logBoxCreated('user_123', 'testuser', 'box_123', 'Project Files');

      expect(logSpy).toHaveBeenCalledWith({
        userId: 'user_123',
        userName: 'testuser',
        type: ActivityType.BOX_CREATED,
        description: 'Created box "Project Files"',
        boxId: 'box_123',
        boxName: 'Project Files',
      });
    });

    it('should log member added activity', async () => {
      await service.logMemberAdded('user_123', 'testuser', 'box_123', 'Project Files', 'Jane Doe');

      expect(logSpy).toHaveBeenCalledWith({
        userId: 'user_123',
        userName: 'testuser',
        type: ActivityType.MEMBER_ADDED,
        description: 'Added Jane Doe to box "Project Files"',
        boxId: 'box_123',
        boxName: 'Project Files',
        metadata: { memberName: 'Jane Doe' },
      });
    });
  });
});
