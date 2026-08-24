import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ROLES, type Role } from '../../../domain/enums/role.enum';

export class RegisterRequestDto {
  @ApiProperty({ example: 'vendor@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Vendor One' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: 'Str0ng!Passw0rd' })
  @IsString()
  @MinLength(12)
  password!: string;

  @ApiProperty({ required: false, enum: ROLES, isArray: true })
  @IsOptional()
  roles?: Role[];
}

export class LoginRequestDto {
  @ApiProperty({ example: 'vendor@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  password!: string;
}

export class ChangePasswordRequestDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  currentPassword!: string;

  @ApiProperty()
  @IsString()
  @MinLength(12)
  newPassword!: string;
}

export class ForgotPasswordRequestDto {
  @ApiProperty({ example: 'vendor@example.com' })
  @IsEmail()
  email!: string;
}

export class ResetPasswordRequestDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  token!: string;

  @ApiProperty()
  @IsString()
  @MinLength(12)
  newPassword!: string;
}

export class AuthSessionResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  expiresInSeconds!: number;

  @ApiProperty()
  user!: {
    userId: string;
    email: string;
    roles: readonly Role[];
  };
}

export class MeResponseDto {
  @ApiProperty()
  userId!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ enum: ROLES, isArray: true })
  roles!: readonly Role[];

  @ApiProperty({ type: [String] })
  permissions!: readonly string[];
}
