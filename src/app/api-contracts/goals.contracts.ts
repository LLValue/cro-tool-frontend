export interface GoalDto {
  id: string;
  projectId: string;
  name: string;
  type: 'clickSelector' | 'urlReached' | 'dataLayerEvent';
  isPrimary: boolean;
  value: string;
  createdAt: string; // ISO string
}

export interface SetGoalsRequest {
  goals: Omit<GoalDto, 'id' | 'projectId' | 'createdAt'>[];
}

