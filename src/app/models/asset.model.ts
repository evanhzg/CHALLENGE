import { ChallengeService } from '../services/challenge.service';
import { System } from './system.model';

export interface ValueData {
  timestamp: Date;
  value: number;
}

export interface AssetData {
  name: string;
  values: ValueData[];
}

export class Asset {
  public id: string;
  public label: string;
  public system_ids: string[];
  public data: AssetData[];
  constructor(private service: ChallengeService) { }

  deserialize(input: any): this {
    Object.assign(this, input);
    return this;
  }
}
