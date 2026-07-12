import { User } from "../models/User.js";

describe("User Model Instance Methods", () => {
  it("should correctly hash passwords and verify them", async () => {
    const user = new User({ email: "test@example.com", name: "Test User" });
    await user.setPassword("supersecretpassword123");

    expect(user.passwordHash).toBeDefined();
    expect(user.passwordHash).not.toBe("supersecretpassword123");

    const isMatch = await user.checkPassword("supersecretpassword123");
    expect(isMatch).toBe(true);

    const isWrongMatch = await user.checkPassword("wrongpassword");
    expect(isWrongMatch).toBe(false);
  });

  it("should calculate correct BMI and categories", () => {
    const user = new User({
      email: "bmi@example.com",
      name: "Bmi Test",
      heightCm: 180,
      weightKg: 80,
    });

    // BMI = 80 / (1.8 * 1.8) = 80 / 3.24 = 24.69
    expect(user.getBmi()).toBeCloseTo(24.69, 1);
    expect(user.getBmiCategory()).toBe("Normal");

    user.weightKg = 50; // BMI = 50 / 3.24 = 15.43
    expect(user.getBmiCategory()).toBe("Underweight");

    user.weightKg = 90; // BMI = 90 / 3.24 = 27.77
    expect(user.getBmiCategory()).toBe("Overweight");

    user.weightKg = 105; // BMI = 105 / 3.24 = 32.4
    expect(user.getBmiCategory()).toBe("Obese");
  });

  it("should create a clean profile summary for the AI context", () => {
    const user = new User({
      name: "John Doe",
      age: 28,
      gender: "male",
      heightCm: 175,
      weightKg: 70,
      goalType: "weight_loss",
      activityLevel: "moderate",
    });

    const summary = user.getProfileSummary();
    expect(summary).toContain("Name: John Doe");
    expect(summary).toContain("Age: 28 years old");
    expect(summary).toContain("Gender: male");
    expect(summary).toContain("Goal: weight_loss");
    expect(summary).toContain("Activity Level: moderate");
    expect(summary).toContain("BMI: 22.9 (Normal)");
  });
});
