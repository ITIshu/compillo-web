export interface LabExperiment {
  id: string;
  experimentNumber: number;
  title: string;
  filename: string;
  language: string;
  aim: string;
  algorithm?: string[];
  sampleInput?: string;
  sampleOutput?: string;
  code: string;
}

export interface ProgrammingLab {
  id: string;
  code: string; // e.g. "3CS4-21"
  name: string; // e.g. "Python Programming Lab"
  semester: string;
  language: string;
  icon: string;
  description: string;
  experiments: LabExperiment[];
}

export interface University {
  id: string;
  name: string;
  shortName: string;
  location: string;
  badge: string;
  curriculum: string;
  labs: ProgrammingLab[];
}

export const UNIVERSITIES_DATA: University[] = [
  {
    id: 'rtu',
    name: 'Rajasthan Technical University (RTU)',
    shortName: 'RTU',
    location: 'Kota, Rajasthan',
    badge: 'State Tech University',
    curriculum: 'RTU B.Tech CSE / IT Syllabus (CBCS Scheme)',
    labs: [
      {
        id: 'rtu-python',
        code: '3CS4-21',
        name: 'Python Programming Lab',
        semester: 'Semester III',
        language: 'python',
        icon: '🐍',
        description: 'Comprehensive Python programming laboratory covering fundamentals, control flow, data structures, OOP, file handling, and algorithms.',
        experiments: [
          {
            id: 'rtu-py-exp1',
            experimentNumber: 1,
            title: 'Interactive Calculator & Basic Data Types',
            filename: 'rtu_python_lab_exp1.py',
            language: 'python',
            aim: 'Write a Python program to demonstrate the use of basic data types, arithmetic, relational, logical, bitwise operators, and formatted user I/O.',
            algorithm: [
              '1. Start the program.',
              '2. Display welcome banner and declare variables of integer, float, string, boolean, and complex types.',
              '3. Take two numerical inputs from the user.',
              '4. Perform arithmetic operations (+, -, *, /, //, %, **).',
              '5. Demonstrate relational (==, !=, <, >, <=, >=) and logical (and, or, not) operators.',
              '6. Demonstrate bitwise operators (&, |, ^, ~, <<, >>).',
              '7. Display formatted output using f-strings and exit.',
            ],
            sampleInput: 'First Number: 25\nSecond Number: 4',
            sampleOutput: 'Sum: 29, Diff: 21, Prod: 100, Div: 6.25, Floor Div: 6, Mod: 1, Pow: 390625',
            code: `"""
====================================================================
RAJASTHAN TECHNICAL UNIVERSITY (RTU), KOTA
Department of Computer Science & Engineering
Course: B.Tech CSE / IT | Semester III
Subject: Python Programming Lab (Course Code: 3CS4-21)
--------------------------------------------------------------------
EXPERIMENT NO: 1
AIM: Write a Python program to demonstrate basic data types,
     arithmetic, relational, logical, bitwise operators, and
     formatted user input/output with an interactive calculator.
====================================================================
"""

def demonstrate_data_types():
    print("=" * 60)
    print("PART 1: DEMONSTRATION OF PYTHON FUNDAMENTAL DATA TYPES")
    print("=" * 60)
    
    integer_val = 108
    float_val = 3.14159
    string_val = "RTU Kota - Compillo Studio"
    bool_val = True
    complex_val = 3 + 4j
    none_val = None

    print(f"Integer: {integer_val} | Type: {type(integer_val).__name__}")
    print(f"Float:   {float_val} | Type: {type(float_val).__name__}")
    print(f"String:  '{string_val}' | Type: {type(string_val).__name__}")
    print(f"Boolean: {bool_val} | Type: {type(bool_val).__name__}")
    print(f"Complex: {complex_val} | Type: {type(complex_val).__name__}")
    print(f"None:    {none_val} | Type: {type(none_val).__name__}")
    print()


def interactive_calculator(a: float, b: float):
    print("=" * 60)
    print(f"PART 2: ARITHMETIC OPERATORS (Inputs: a = {a}, b = {b})")
    print("=" * 60)
    
    print(f"Addition (a + b)            = {a + b}")
    print(f"Subtraction (a - b)         = {a - b}")
    print(f"Multiplication (a * b)      = {a * b}")
    if b != 0:
        print(f"Division (a / b)            = {a / b:.4f}")
        print(f"Floor Division (a // b)     = {a // b}")
        print(f"Modulus / Remainder (a % b) = {a % b}")
    else:
        print("Division by zero is undefined.")
    print(f"Exponentiation (a ** 2)     = {a ** 2}")
    print()


def demonstrate_relational_and_logical(a: float, b: float):
    print("=" * 60)
    print("PART 3: RELATIONAL & LOGICAL OPERATORS")
    print("=" * 60)
    
    print(f"a == b : {a == b}")
    print(f"a != b : {a != b}")
    print(f"a > b  : {a > b}")
    print(f"a < b  : {a < b}")
    print(f"a >= b : {a >= b}")
    print(f"a <= b : {a <= b}")
    print()
    print("Logical Conditions:")
    print(f"(a > 0) and (b > 0) : {(a > 0) and (b > 0)}")
    print(f"(a > 0) or (b < 0)  : {(a > 0) or (b < 0)}")
    print(f"not (a == b)        : {not (a == b)}")
    print()


def demonstrate_bitwise(x: int, y: int):
    print("=" * 60)
    print(f"PART 4: BITWISE OPERATORS (Integers: x = {x}, y = {y})")
    print("=" * 60)
    
    print(f"Binary of x : {bin(x)}")
    print(f"Binary of y : {bin(y)}")
    print(f"Bitwise AND (x & y)  = {x & y} ({bin(x & y)})")
    print(f"Bitwise OR  (x | y)  = {x | y} ({bin(x | y)})")
    print(f"Bitwise XOR (x ^ y)  = {x ^ y} ({bin(x ^ y)})")
    print(f"Bitwise NOT (~x)     = {~x}")
    print(f"Left Shift  (x << 1) = {x << 1} (multiplies by 2)")
    print(f"Right Shift (x >> 1) = {x >> 1} (integer divides by 2)")
    print()


if __name__ == "__main__":
    print("============================================================")
    print("  RTU KOTA - PYTHON PROGRAMMING LAB - EXPERIMENT 1")
    print("============================================================\\n")
    
    demonstrate_data_types()
    
    # Sample input values for demonstration (modify as needed)
    num1 = 25.0
    num2 = 4.0
    
    interactive_calculator(num1, num2)
    demonstrate_relational_and_logical(num1, num2)
    demonstrate_bitwise(int(num1), int(num2))
    
    print("=" * 60)
    print("EXPERIMENT 1 EXECUTION COMPLETED SUCCESSFULLY!")
    print("============================================================")
`,
          },
          {
            id: 'rtu-py-exp2',
            experimentNumber: 2,
            title: 'Control Flow: Prime Numbers, Fibonacci & Leap Year',
            filename: 'rtu_python_lab_exp2.py',
            language: 'python',
            aim: 'Write a Python program to demonstrate conditional branching and loops to check prime numbers in a range, generate the Fibonacci sequence, and determine leap years.',
            algorithm: [
              '1. Start the program.',
              '2. Define function is_prime(n) using trial division up to sqrt(n).',
              '3. Generate all primes in interval [start, end].',
              '4. Define fibonacci(n) generating n terms iteratively.',
              '5. Define is_leap_year(year) checking divisibility by 4, 100, 400.',
              '6. Execute test runs with formatted outputs.',
            ],
            code: `"""
====================================================================
RAJASTHAN TECHNICAL UNIVERSITY (RTU), KOTA
Subject: Python Programming Lab (Course Code: 3CS4-21)
--------------------------------------------------------------------
EXPERIMENT NO: 2
AIM: Demonstrate conditional structures (if-elif-else) and loops
     (for, while) to find prime numbers, Fibonacci series, and leap years.
====================================================================
"""
import math

def is_prime(n: int) -> bool:
    """Checks whether a number n is prime."""
    if n <= 1:
        return False
    if n <= 3:
        return True
    if n % 2 == 0 or n % 3 == 0:
        return False
    i = 5
    while i * i <= n:
        if n % i == 0 or n % (i + 2) == 0:
            return False
        i += 6
    return True


def find_primes_in_range(start: int, end: int):
    primes = [num for num in range(start, end + 1) if is_prime(num)]
    print(f"Prime numbers between {start} and {end} ({len(primes)} found):")
    print(primes)
    return primes


def generate_fibonacci(terms: int):
    """Generates the first n terms of Fibonacci series."""
    if terms <= 0:
        return []
    sequence = [0, 1] if terms > 1 else [0]
    while len(sequence) < terms:
        sequence.append(sequence[-1] + sequence[-2])
    print(f"\\nFirst {terms} terms of Fibonacci series:")
    print(" -> ".join(map(str, sequence)))
    return sequence


def check_leap_year(year: int) -> bool:
    """A leap year is divisible by 4, not 100, unless divisible by 400."""
    is_leap = (year % 4 == 0 and year % 100 != 0) or (year % 400 == 0)
    status = "is a LEAP YEAR" if is_leap else "is NOT a leap year"
    print(f"Year {year} {status}.")
    return is_leap


if __name__ == "__main__":
    print("--- RTU PYTHON LAB: EXPERIMENT 2 ---")
    find_primes_in_range(10, 60)
    generate_fibonacci(12)
    print()
    check_leap_year(2024)
    check_leap_year(2026)
    check_leap_year(2000)
    check_leap_year(1900)
    print("\\nExperiment 2 Execution Completed Successfully!")
`,
          },
          {
            id: 'rtu-py-exp3',
            experimentNumber: 3,
            title: 'String Manipulations, Palindrome & Anagram Check',
            filename: 'rtu_python_lab_exp3.py',
            language: 'python',
            aim: 'Write a Python program to perform string operations including slicing, reversing, palindrome verification, character frequency counting, and anagram detection.',
            code: `"""
====================================================================
RAJASTHAN TECHNICAL UNIVERSITY (RTU), KOTA
Subject: Python Programming Lab (Course Code: 3CS4-21)
--------------------------------------------------------------------
EXPERIMENT NO: 3
AIM: Demonstrate string manipulations, slicing, palindrome check,
     vowel/consonant count, and anagram detection.
====================================================================
"""

def is_palindrome(text: str) -> bool:
    # Remove whitespace and convert to lowercase for robust check
    clean = "".join(ch.lower() for ch in text if ch.isalnum())
    return clean == clean[::-1]


def count_vowels_consonants(text: str):
    vowels = "aeiouAEIOU"
    v_count = 0
    c_count = 0
    d_count = 0
    s_count = 0

    for ch in text:
        if ch in vowels:
            v_count += 1
        elif ch.isalpha():
            c_count += 1
        elif ch.isdigit():
            d_count += 1
        else:
            s_count += 1

    return {
        "vowels": v_count,
        "consonants": c_count,
        "digits": d_count,
        "special_or_spaces": s_count,
    }


def is_anagram(s1: str, s2: str) -> bool:
    c1 = sorted(s1.replace(" ", "").lower())
    c2 = sorted(s2.replace(" ", "").lower())
    return c1 == c2


if __name__ == "__main__":
    print("--- RTU PYTHON LAB: EXPERIMENT 3 ---")
    
    phrase = "A man a plan a canal Panama"
    print(f"Testing Palindrome: '{phrase}'")
    print(f"Result: {is_palindrome(phrase)}\\n")

    sample = "Rajasthan Technical University, Kota - CSE 2026!"
    stats = count_vowels_consonants(sample)
    print(f"Analyzing string: '{sample}'")
    for k, v in stats.items():
        print(f"  {k.capitalize()}: {v}")

    print("\\nTesting Anagrams:")
    w1, w2 = "listen", "silent"
    print(f"'{w1}' and '{w2}': {is_anagram(w1, w2)}")
    
    print("\\nExperiment 3 Execution Completed Successfully!")
`,
          },
          {
            id: 'rtu-py-exp4',
            experimentNumber: 4,
            title: 'Lists, Tuples & Matrix Operations',
            filename: 'rtu_python_lab_exp4.py',
            language: 'python',
            aim: 'Write a Python program to perform list operations (slicing, comprehension, sorting) and implement 2D Matrix addition and multiplication.',
            code: `"""
====================================================================
RAJASTHAN TECHNICAL UNIVERSITY (RTU), KOTA
Subject: Python Programming Lab (Course Code: 3CS4-21)
--------------------------------------------------------------------
EXPERIMENT NO: 4
AIM: List manipulations, tuple unpacking, and 2D Matrix operations
     (Addition, Transpose, and Matrix Multiplication).
====================================================================
"""

def print_matrix(mat, name="Matrix"):
    print(f"{name}:")
    for row in mat:
        print("  [ " + "  ".join(f"{val:3d}" for val in row) + " ]")
    print()


def matrix_addition(A, B):
    rows, cols = len(A), len(A[0])
    return [[A[i][j] + B[i][j] for j in range(cols)] for i in range(rows)]


def matrix_multiplication(A, B):
    r1, c1 = len(A), len(A[0])
    r2, c2 = len(B), len(B[0])
    if c1 != r2:
        raise ValueError("Cannot multiply matrices: column count of A must equal row count of B")

    result = [[0 for _ in range(c2)] for _ in range(r1)]
    for i in range(r1):
        for j in range(c2):
            for k in range(c1):
                result[i][j] += A[i][k] * B[k][j]
    return result


def matrix_transpose(A):
    return [[A[j][i] for j in range(len(A))] for i in range(len(A[0]))]


if __name__ == "__main__":
    print("--- RTU PYTHON LAB: EXPERIMENT 4 ---")

    mat_A = [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9]
    ]

    mat_B = [
        [9, 8, 7],
        [6, 5, 4],
        [3, 2, 1]
    ]

    print_matrix(mat_A, "Matrix A")
    print_matrix(mat_B, "Matrix B")

    added = matrix_addition(mat_A, mat_B)
    print_matrix(added, "Matrix A + Matrix B")

    transposed = matrix_transpose(mat_A)
    print_matrix(transposed, "Transpose of Matrix A")

    multiplied = matrix_multiplication(mat_A, mat_B)
    print_matrix(multiplied, "Matrix A * Matrix B")

    print("Experiment 4 Execution Completed Successfully!")
`,
          },
          {
            id: 'rtu-py-exp5',
            experimentNumber: 5,
            title: 'Dictionaries & Sets: Student Grade Book & Word Frequency',
            filename: 'rtu_python_lab_exp5.py',
            language: 'python',
            aim: 'Write a Python program to demonstrate dictionaries and sets by building a student record database with GPA calculation and a text word-frequency counter.',
            code: `"""
====================================================================
RAJASTHAN TECHNICAL UNIVERSITY (RTU), KOTA
Subject: Python Programming Lab (Course Code: 3CS4-21)
--------------------------------------------------------------------
EXPERIMENT NO: 5
AIM: Implement a Student Record Management system using Python
     dictionaries and a text word frequency counter using Sets.
====================================================================
"""

class StudentGradeBook:
    def __init__(self):
        self.students = {}

    def add_student(self, roll_no: str, name: str, marks: dict):
        total = sum(marks.values())
        avg = total / len(marks)
        grade = "A+" if avg >= 90 else "A" if avg >= 80 else "B" if avg >= 70 else "C" if avg >= 60 else "F"
        self.students[roll_no] = {
            "name": name,
            "marks": marks,
            "average": avg,
            "grade": grade,
        }

    def display_records(self):
        print(f"{'Roll No':<10} | {'Name':<18} | {'Average':<8} | {'Grade':<6}")
        print("-" * 52)
        for r_no, info in self.students.items():
            print(f"{r_no:<10} | {info['name']:<18} | {info['average']:<8.2f} | {info['grade']:<6}")
        print()


def word_frequency_counter(passage: str):
    words = [w.strip(".,!?:;\\\"").lower() for w in passage.split()]
    freq = {}
    for word in words:
        if word:
            freq[word] = freq.get(word, 0) + 1
    return freq


if __name__ == "__main__":
    print("--- RTU PYTHON LAB: EXPERIMENT 5 ---")
    gradebook = StudentGradeBook()
    gradebook.add_student("22ERTCS001", "Aarav Sharma", {"Python": 92, "DSA": 88, "Maths": 95})
    gradebook.add_student("22ERTCS002", "Priya Verma", {"Python": 85, "DSA": 90, "Maths": 78})
    gradebook.add_student("22ERTCS003", "Rohan Mehta", {"Python": 74, "DSA": 65, "Maths": 70})

    gradebook.display_records()

    sample_text = "RTU Kota is a leading technical university. RTU trains engineers in Python, algorithms and technology."
    freqs = word_frequency_counter(sample_text)
    print("Word Frequency Analysis (Top words):")
    for word, count in sorted(freqs.items(), key=lambda x: -x[1])[:5]:
        print(f"  '{word}': {count} time(s)")

    print("\\nExperiment 5 Execution Completed Successfully!")
`,
          },
          {
            id: 'rtu-py-exp6',
            experimentNumber: 6,
            title: 'Functions, Variable Arguments & Recursion',
            filename: 'rtu_python_lab_exp6.py',
            language: 'python',
            aim: 'Write a Python program to demonstrate user-defined functions with default arguments, *args, **kwargs, and recursive functions for Factorial, GCD, and Tower of Hanoi.',
            code: `"""
====================================================================
RAJASTHAN TECHNICAL UNIVERSITY (RTU), KOTA
Subject: Python Programming Lab (Course Code: 3CS4-21)
--------------------------------------------------------------------
EXPERIMENT NO: 6
AIM: Implement functions with *args, **kwargs, and recursive solutions
     for Factorial, GCD (Euclid's algorithm), and Tower of Hanoi.
====================================================================
"""

def recursive_factorial(n: int) -> int:
    if n <= 1:
        return 1
    return n * recursive_factorial(n - 1)


def recursive_gcd(a: int, b: int) -> int:
    """Euclidean algorithm for greatest common divisor."""
    if b == 0:
        return a
    return recursive_gcd(b, a % b)


def tower_of_hanoi(n: int, source: str, destination: str, auxiliary: str, steps: list):
    if n == 1:
        steps.append(f"Move disk 1 from rod {source} -> {destination}")
        return
    tower_of_hanoi(n - 1, source, auxiliary, destination, steps)
    steps.append(f"Move disk {n} from rod {source} -> {destination}")
    tower_of_hanoi(n - 1, auxiliary, destination, source, steps)


def flexible_logger(prefix: str = "[INFO]", *args, **kwargs):
    message = " ".join(str(a) for a in args)
    meta = ", ".join(f"{k}={v}" for k, v in kwargs.items())
    print(f"{prefix} {message} {f'({meta})' if meta else ''}")


if __name__ == "__main__":
    print("--- RTU PYTHON LAB: EXPERIMENT 6 ---")
    print(f"Factorial of 6: {recursive_factorial(6)}")
    print(f"GCD of 48 and 18: {recursive_gcd(48, 18)}")

    hanoi_steps = []
    tower_of_hanoi(3, 'A', 'C', 'B', hanoi_steps)
    print(f"\\nTower of Hanoi for 3 Disks ({len(hanoi_steps)} moves):")
    for step in hanoi_steps:
        print("  " + step)

    print("\\nDemonstrating *args and **kwargs:")
    flexible_logger("[RTU-SYSTEM]", "Server ready", "Database connected", port=3000, status="active")
    print("\\nExperiment 6 Execution Completed Successfully!")
`,
          },
          {
            id: 'rtu-py-exp7',
            experimentNumber: 7,
            title: 'File Handling & Text File Analysis',
            filename: 'rtu_python_lab_exp7.py',
            language: 'python',
            aim: 'Write a Python program to perform file input/output operations, count words, lines, and characters, and handle file exceptions gracefully.',
            code: `"""
====================================================================
RAJASTHAN TECHNICAL UNIVERSITY (RTU), KOTA
Subject: Python Programming Lab (Course Code: 3CS4-21)
--------------------------------------------------------------------
EXPERIMENT NO: 7
AIM: File I/O operations in Python: Create, write, read, and analyze
     file contents (line count, word count, character count).
====================================================================
"""
import os

def create_sample_file(filename: str):
    content = """Rajasthan Technical University, Kota
Department of Computer Science & Engineering
Course: Python Programming Laboratory
Experiment 7: File I/O Demonstration
Compillo Studio Cloud Workspace Active.
"""
    with open(filename, 'w') as f:
        f.write(content)
    print(f"Created file '{filename}' with sample contents.")


def analyze_file(filename: str):
    if not os.path.exists(filename):
        print(f"Error: File '{filename}' does not exist.")
        return

    with open(filename, 'r') as f:
        lines = f.readlines()

    line_count = len(lines)
    word_count = sum(len(line.split()) for line in lines)
    char_count = sum(len(line) for line in lines)

    print(f"\\nFile Analysis for '{filename}':")
    print(f"  Total Lines:      {line_count}")
    print(f"  Total Words:      {word_count}")
    print(f"  Total Characters: {char_count}")
    print("\\nFile Content Preview:")
    for idx, line in enumerate(lines, start=1):
        print(f"  [{idx:02d}] {line.strip()}")


if __name__ == "__main__":
    print("--- RTU PYTHON LAB: EXPERIMENT 7 ---")
    test_file = "rtu_demo_output.txt"
    create_sample_file(test_file)
    analyze_file(test_file)
    print("\\nExperiment 7 Execution Completed Successfully!")
`,
          },
          {
            id: 'rtu-py-exp8',
            experimentNumber: 8,
            title: 'Object-Oriented Programming (Classes & Inheritance)',
            filename: 'rtu_python_lab_exp8.py',
            language: 'python',
            aim: 'Write a Python program to demonstrate Object-Oriented Programming concepts including constructors, encapsulation, class/instance variables, and inheritance with a Bank Account system.',
            code: `"""
====================================================================
RAJASTHAN TECHNICAL UNIVERSITY (RTU), KOTA
Subject: Python Programming Lab (Course Code: 3CS4-21)
--------------------------------------------------------------------
EXPERIMENT NO: 8
AIM: Implement Object-Oriented Programming (Classes, Methods,
     Encapsulation, and Single/Multilevel Inheritance).
====================================================================
"""

class BankAccount:
    """Base class demonstrating encapsulation and account management."""
    bank_name = "State Bank of RTU Kota"

    def __init__(self, account_number: str, holder_name: str, initial_balance: float = 0.0):
        self.account_number = account_number
        self.holder_name = holder_name
        self.__balance = initial_balance  # Private attribute

    def deposit(self, amount: float):
        if amount > 0:
            self.__balance += amount
            print(f"[Deposit] Credited Rs.{amount:.2f} to {self.account_number}. New Balance: Rs.{self.__balance:.2f}")
        else:
            print("Invalid deposit amount.")

    def withdraw(self, amount: float):
        if 0 < amount <= self.__balance:
            self.__balance -= amount
            print(f"[Withdraw] Debited Rs.{amount:.2f} from {self.account_number}. Remaining: Rs.{self.__balance:.2f}")
        else:
            print("[Error] Insufficient funds or invalid amount.")

    def get_balance(self) -> float:
        return self.__balance


class SavingsAccount(BankAccount):
    """Derived class inheriting from BankAccount with interest feature."""
    def __init__(self, account_number: str, holder_name: str, initial_balance: float = 1000.0, interest_rate: float = 4.5):
        super().__init__(account_number, holder_name, initial_balance)
        self.interest_rate = interest_rate

    def apply_interest(self):
        interest = (self.get_balance() * self.interest_rate) / 100
        self.deposit(interest)
        print(f"[Interest] Applied {self.interest_rate}% interest: Rs.{interest:.2f}")


if __name__ == "__main__":
    print("--- RTU PYTHON LAB: EXPERIMENT 8 ---")
    acc = SavingsAccount("RTU-SB-10442", "Kavya Lavania", 5000.0, 5.0)
    print(f"Bank: {BankAccount.bank_name}")
    print(f"Holder: {acc.holder_name} | Acc: {acc.account_number}")
    print(f"Initial Balance: Rs.{acc.get_balance():.2f}\\n")

    acc.deposit(2500)
    acc.withdraw(1200)
    acc.apply_interest()
    print(f"\\nFinal Balance: Rs.{acc.get_balance():.2f}")
    print("Experiment 8 Execution Completed Successfully!")
`,
          },
          {
            id: 'rtu-py-exp9',
            experimentNumber: 9,
            title: 'Exception Handling & Custom Exceptions',
            filename: 'rtu_python_lab_exp9.py',
            language: 'python',
            aim: 'Write a Python program to demonstrate exception handling with try, except, else, finally, and custom user-defined exceptions.',
            code: `"""
====================================================================
RAJASTHAN TECHNICAL UNIVERSITY (RTU), KOTA
Subject: Python Programming Lab (Course Code: 3CS4-21)
--------------------------------------------------------------------
EXPERIMENT NO: 9
AIM: Implement robust exception handling using try, except, else,
     finally, and define custom exception classes.
====================================================================
"""

class AgeInvalidError(Exception):
    """Custom exception raised when an age is outside valid voting bounds."""
    def __init__(self, age: int, message: str = "Age must be between 18 and 120 for voter eligibility"):
        self.age = age
        self.message = message
        super().__init__(f"{message} (Provided: {age})")


def check_voter_eligibility(name: str, age: int):
    try:
        if age < 0:
            raise ValueError("Age cannot be negative.")
        if age < 18 or age > 120:
            raise AgeInvalidError(age)
        print(f"[ELIGIBLE] {name} (Age: {age}) is eligible to cast vote.")
    except AgeInvalidError as aie:
        print(f"[CUSTOM EXCEPTION] {aie}")
    except ValueError as ve:
        print(f"[VALUE ERROR] {ve}")
    finally:
        print("  Verification check finished.")


def safe_divide(numerator: float, denominator: float):
    try:
        result = numerator / denominator
    except ZeroDivisionError:
        print("[ERROR] Cannot divide by zero!")
        return None
    except TypeError as te:
        print(f"[TYPE ERROR] Invalid operand types: {te}")
        return None
    else:
        print(f"[SUCCESS] {numerator} / {denominator} = {result:.4f}")
        return result


if __name__ == "__main__":
    print("--- RTU PYTHON LAB: EXPERIMENT 9 ---")
    safe_divide(100, 4)
    safe_divide(50, 0)
    print()
    check_voter_eligibility("Aarav", 21)
    check_voter_eligibility("Priya", 16)
    check_voter_eligibility("TestUser", -5)
    print("\\nExperiment 9 Execution Completed Successfully!")
`,
          },
          {
            id: 'rtu-py-exp10',
            experimentNumber: 10,
            title: 'Numerical Simulation & Basic Statistical Analysis',
            filename: 'rtu_python_lab_exp10.py',
            language: 'python',
            aim: 'Write a Python program to perform statistical computations (Mean, Median, Mode, Variance, Standard Deviation) and simulate data analysis.',
            code: `"""
====================================================================
RAJASTHAN TECHNICAL UNIVERSITY (RTU), KOTA
Subject: Python Programming Lab (Course Code: 3CS4-21)
--------------------------------------------------------------------
EXPERIMENT NO: 10
AIM: Implement statistical computation algorithms (Mean, Median,
     Variance, Standard Deviation) without external libraries.
====================================================================
"""
import math

def calculate_mean(dataset):
    return sum(dataset) / len(dataset)


def calculate_median(dataset):
    s = sorted(dataset)
    n = len(s)
    mid = n // 2
    if n % 2 == 0:
        return (s[mid - 1] + s[mid]) / 2.0
    return float(s[mid])


def calculate_variance(dataset):
    m = calculate_mean(dataset)
    return sum((x - m) ** 2 for x in dataset) / len(dataset)


def calculate_std_dev(dataset):
    return math.sqrt(calculate_variance(dataset))


if __name__ == "__main__":
    print("--- RTU PYTHON LAB: EXPERIMENT 10 ---")
    # Sample marks obtained by RTU CSE students
    student_scores = [78, 85, 92, 65, 88, 75, 90, 82, 95, 70, 84, 88]

    print(f"Dataset (Student Scores): {student_scores}")
    print(f"Total Observations: {len(student_scores)}")
    print(f"Minimum Score:      {min(student_scores)}")
    print(f"Maximum Score:      {max(student_scores)}")
    print(f"Mean (Average):     {calculate_mean(student_scores):.2f}")
    print(f"Median:             {calculate_median(student_scores):.2f}")
    print(f"Variance:           {calculate_variance(student_scores):.2f}")
    print(f"Standard Deviation: {calculate_std_dev(student_scores):.2f}")
    print("\\nExperiment 10 Execution Completed Successfully!")
`,
          },
        ],
      },
      {
        id: 'rtu-dsa',
        code: '3CS4-22',
        name: 'Data Structures & Algorithms Lab',
        semester: 'Semester III',
        language: 'python',
        icon: '🌳',
        description: 'Implementation of fundamental linear and non-linear data structures including Linked Lists, Stacks, Queues, Binary Trees, and Sorting.',
        experiments: [
          {
            id: 'rtu-dsa-exp1',
            experimentNumber: 1,
            title: 'Linear & Binary Search with Benchmark Comparison',
            filename: 'rtu_dsa_lab_exp1.py',
            language: 'python',
            aim: 'Write a program to implement Linear Search and Binary Search algorithms and compare their time performance on sorted arrays.',
            code: `"""
====================================================================
RAJASTHAN TECHNICAL UNIVERSITY (RTU), KOTA
Subject: Data Structures & Algorithms Lab (3CS4-22)
--------------------------------------------------------------------
EXPERIMENT NO: 1
AIM: Implementation of Linear Search and Binary Search algorithms.
====================================================================
"""

def linear_search(arr, target):
    comparisons = 0
    for idx, val in enumerate(arr):
        comparisons += 1
        if val == target:
            return idx, comparisons
    return -1, comparisons


def binary_search(arr, target):
    low = 0
    high = len(arr) - 1
    comparisons = 0

    while low <= high:
        comparisons += 1
        mid = (low + high) // 2
        if arr[mid] == target:
            return mid, comparisons
        elif arr[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
    return -1, comparisons


if __name__ == "__main__":
    dataset = [12, 24, 35, 47, 53, 68, 72, 85, 91, 104, 118, 130]
    key = 85
    print(f"Array: {dataset}")
    print(f"Search Key: {key}\\n")

    lin_idx, lin_comps = linear_search(dataset, key)
    print(f"Linear Search: Found at index {lin_idx} in {lin_comps} comparison(s)")

    bin_idx, bin_comps = binary_search(dataset, key)
    print(f"Binary Search: Found at index {bin_idx} in {bin_comps} comparison(s)")
`,
          },
          {
            id: 'rtu-dsa-exp2',
            experimentNumber: 2,
            title: 'Singly Linked List (Insert, Delete, Traverse & Reverse)',
            filename: 'rtu_dsa_lab_exp2.py',
            language: 'python',
            aim: 'Write a program to implement a Singly Linked List with operations: insert at beginning/end, delete by value, traverse, and reverse.',
            code: `"""
====================================================================
RAJASTHAN TECHNICAL UNIVERSITY (RTU), KOTA
Subject: Data Structures & Algorithms Lab (3CS4-22)
--------------------------------------------------------------------
EXPERIMENT NO: 2
AIM: Implementation of Singly Linked List with full operations.
====================================================================
"""

class Node:
    def __init__(self, data):
        self.data = data
        self.next = None

class SinglyLinkedList:
    def __init__(self):
        self.head = None

    def insert_at_end(self, data):
        new_node = Node(data)
        if not self.head:
            self.head = new_node
            return
        curr = self.head
        while curr.next:
            curr = curr.next
        curr.next = new_node

    def insert_at_beginning(self, data):
        new_node = Node(data)
        new_node.next = self.head
        self.head = new_node

    def display(self):
        elements = []
        curr = self.head
        while curr:
            elements.append(str(curr.data))
            curr = curr.next
        print(" -> ".join(elements) + " -> NULL")

    def reverse(self):
        prev = None
        curr = self.head
        while curr:
            next_node = curr.next
            curr.next = prev
            prev = curr
            curr = next_node
        self.head = prev


if __name__ == "__main__":
    sll = SinglyLinkedList()
    for val in [10, 20, 30, 40]:
        sll.insert_at_end(val)
    sll.insert_at_beginning(5)

    print("Linked List:")
    sll.display()

    print("Reversed Linked List:")
    sll.reverse()
    sll.display()
`,
          },
        ],
      },
    ],
  },
  {
    id: 'aktu',
    name: 'Dr. A.P.J. Abdul Kalam Technical University (AKTU)',
    shortName: 'AKTU',
    location: 'Lucknow, Uttar Pradesh',
    badge: 'State Tech University',
    curriculum: 'AKTU B.Tech Curriculum (AICTE Model)',
    labs: [
      {
        id: 'aktu-python',
        code: 'KCS-353',
        name: 'Python Programming Lab',
        semester: 'Semester III / IV',
        language: 'python',
        icon: '🐍',
        description: 'AKTU curriculum covering core Python programming, data analytics, modules, and algorithm implementations.',
        experiments: [
          {
            id: 'aktu-py-exp1',
            experimentNumber: 1,
            title: 'Basic Syntax, Conditional Statements & Loops',
            filename: 'aktu_python_lab_exp1.py',
            language: 'python',
            aim: 'Write a program to demonstrate if-else ladders, nested loops, and calculate Armstrong and Strong numbers.',
            code: `"""
====================================================================
DR. A.P.J. ABDUL KALAM TECHNICAL UNIVERSITY (AKTU), LUCKNOW
Subject: Python Programming Lab (KCS-353)
EXPERIMENT NO: 1
AIM: Check Armstrong Number and Strong Number using while loops.
====================================================================
"""
import math

def is_armstrong(n: int) -> bool:
    digits = [int(d) for d in str(n)]
    power = len(digits)
    return sum(d ** power for d in digits) == n

def is_strong_number(n: int) -> bool:
    return sum(math.factorial(int(d)) for d in str(n)) == n

if __name__ == "__main__":
    test_nums = [153, 370, 371, 407, 145, 40585]
    print("Testing Armstrong & Strong Numbers (AKTU Lab Exp 1):")
    for num in test_nums:
        arm = "YES" if is_armstrong(num) else "NO"
        strong = "YES" if is_strong_number(num) else "NO"
        print(f"Number {num:6d} -> Armstrong: {arm:<4} | Strong: {strong}")
`,
          },
        ],
      },
    ],
  },
  {
    id: 'vtu',
    name: 'Visvesvaraya Technological University (VTU)',
    shortName: 'VTU',
    location: 'Belagavi, Karnataka',
    badge: 'State Tech University',
    curriculum: 'VTU B.E. Scheme 2021 / 2022',
    labs: [
      {
        id: 'vtu-python',
        code: '21CSL46',
        name: 'Python Programming Laboratory',
        semester: 'Semester IV',
        language: 'python',
        icon: '⚡',
        description: 'VTU prescribed syllabus covering python strings, files, exception handling, and GUI development.',
        experiments: [
          {
            id: 'vtu-py-exp1',
            experimentNumber: 1,
            title: 'Student Test Average & Best Two Calculation',
            filename: 'vtu_python_lab_exp1.py',
            language: 'python',
            aim: 'Write a Python program to find the best of two test marks out of three tests conducted for a student.',
            code: `"""
====================================================================
VISVESVARAYA TECHNOLOGICAL UNIVERSITY (VTU), BELAGAVI
Course Code: 21CSL46 | Python Programming Laboratory
EXPERIMENT NO: 1
AIM: Find best of two test marks out of three tests.
====================================================================
"""

def compute_best_two_average(m1: float, m2: float, m3: float):
    marks = [m1, m2, m3]
    marks.sort(reverse=True)
    best_two = marks[:2]
    avg = sum(best_two) / 2.0
    return best_two, avg

if __name__ == "__main__":
    t1, t2, t3 = 45.0, 48.5, 38.0
    best, average = compute_best_two_average(t1, t2, t3)
    print(f"Test Marks: Test1={t1}, Test2={t2}, Test3={t3}")
    print(f"Best Two Marks: {best[0]} and {best[1]}")
    print(f"Computed Continuous Internal Evaluation (CIE) Average: {average:.2f}")
`,
          },
        ],
      },
    ],
  },
  {
    id: 'anna-univ',
    name: 'Anna University',
    shortName: 'Anna Univ',
    location: 'Chennai, Tamil Nadu',
    badge: 'State Tech University',
    curriculum: 'Anna University Regulation 2021',
    labs: [
      {
        id: 'anna-python',
        code: 'GE3171',
        name: 'Problem Solving and Python Programming Lab',
        semester: 'Semester I / II',
        language: 'python',
        icon: '💻',
        description: 'Anna University foundation course in python programming and algorithm design.',
        experiments: [
          {
            id: 'anna-py-exp1',
            experimentNumber: 1,
            title: 'Newton-Raphson Method for Square Root',
            filename: 'anna_python_lab_exp1.py',
            language: 'python',
            aim: 'Write a Python program to find the square root of a number using Newton’s method.',
            code: `"""
====================================================================
ANNA UNIVERSITY, CHENNAI
Subject: Problem Solving and Python Programming Lab (GE3171)
EXPERIMENT NO: 1
AIM: Find square root of a number using Newton-Raphson Method.
====================================================================
"""

def newton_square_root(n: float, epsilon: float = 1e-7) -> float:
    if n < 0:
        raise ValueError("Cannot calculate square root of a negative number")
    if n == 0:
        return 0.0

    approx = n / 2.0
    iterations = 0

    while True:
        better = (approx + n / approx) / 2.0
        iterations += 1
        if abs(approx - better) < epsilon:
            return better, iterations
        approx = better

if __name__ == "__main__":
    num = 144.0
    root, iters = newton_square_root(num)
    print(f"Square root of {num} via Newton's Method: {root:.6f} ({iters} iterations)")
`,
          },
        ],
      },
    ],
  },
];

// ====================================================================
// ACHIEVEMENT BADGES & PROGRESS TRACKING SERVICE
// ====================================================================

export interface LabBadge {
  id: string;
  title: string;
  category: 'starter' | 'python' | 'dsa' | 'multi' | 'master';
  icon: string;
  description: string;
  reward: string;
  requirementText: string;
  requiredCount: number;
  color: string;
  glowColor: string;
  borderColor: string;
}

export const LAB_BADGES: LabBadge[] = [
  {
    id: 'first-experiment',
    title: 'First Experiment Scholar',
    category: 'starter',
    icon: '🎓',
    description: 'Successfully loaded and ran your very first university laboratory experiment.',
    reward: '+100 Academic XP',
    requirementText: 'Run 1 experiment',
    requiredCount: 1,
    color: '#0284c7',
    glowColor: 'rgba(2, 132, 199, 0.35)',
    borderColor: '#38bdf8',
  },
  {
    id: 'python-prodigy',
    title: 'Python Lab Prodigy',
    category: 'python',
    icon: '🐍',
    description: 'Mastered 3 or more official Python Programming Lab curriculum experiments.',
    reward: '+250 Academic XP',
    requirementText: 'Complete 3 Python experiments',
    requiredCount: 3,
    color: '#10b981',
    glowColor: 'rgba(16, 185, 129, 0.35)',
    borderColor: '#34d399',
  },
  {
    id: 'dsa-architect',
    title: 'Algorithm Architect',
    category: 'dsa',
    icon: '🌳',
    description: 'Completed fundamental Data Structures & Algorithms Lab implementations.',
    reward: '+300 Academic XP',
    requirementText: 'Complete 1 DSA experiment',
    requiredCount: 1,
    color: '#8b5cf6',
    glowColor: 'rgba(139, 92, 246, 0.35)',
    borderColor: '#a78bfa',
  },
  {
    id: 'multi-university',
    title: 'Multi-Uni Explorer',
    category: 'multi',
    icon: '🏛️',
    description: 'Explored and executed syllabus experiments across multiple universities (RTU, AKTU, VTU, Anna Univ).',
    reward: '+400 Academic XP',
    requirementText: 'Run experiments from 2+ universities',
    requiredCount: 2,
    color: '#ec4899',
    glowColor: 'rgba(236, 72, 153, 0.35)',
    borderColor: '#f472b6',
  },
  {
    id: 'execution-ace',
    title: 'Execution Ace',
    category: 'master',
    icon: '⚡',
    description: 'Verified 5 experiments with clean test execution and standard outputs.',
    reward: '+500 Academic XP',
    requirementText: 'Run 5 experiments',
    requiredCount: 5,
    color: '#f59e0b',
    glowColor: 'rgba(245, 158, 11, 0.35)',
    borderColor: '#fbbf24',
  },
  {
    id: 'deans-honor-roll',
    title: "Dean's Honor Roll",
    category: 'master',
    icon: '👑',
    description: 'Reached supreme honor rank by completing 8+ university laboratory experiments.',
    reward: '+1,000 Academic XP & Golden Seal',
    requirementText: 'Run 8 experiments',
    requiredCount: 8,
    color: '#eab308',
    glowColor: 'rgba(234, 179, 8, 0.45)',
    borderColor: '#facc15',
  },
];

export interface CompletedExperimentRecord {
  experimentId: string;
  filename: string;
  universityId: string;
  labId: string;
  completedAt: string;
}

export interface EduLabProgressState {
  completedExperiments: CompletedExperimentRecord[];
  unlockedBadgeIds: string[];
  totalXp: number;
  lastUnlockedBadge: LabBadge | null;
}

const STORAGE_KEY = 'compillo_edu_lab_progress_v1';

class EduLabProgressService {
  private state: EduLabProgressState;
  private listeners: Array<(state: EduLabProgressState) => void> = [];

  constructor() {
    this.state = this.loadFromStorage();
  }

  private loadFromStorage(): EduLabProgressState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          completedExperiments: parsed.completedExperiments || [],
          unlockedBadgeIds: parsed.unlockedBadgeIds || [],
          totalXp: parsed.totalXp || 0,
          lastUnlockedBadge: null,
        };
      }
    } catch {}

    return {
      completedExperiments: [],
      unlockedBadgeIds: [],
      totalXp: 0,
      lastUnlockedBadge: null,
    };
  }

  private saveToStorage() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          completedExperiments: this.state.completedExperiments,
          unlockedBadgeIds: this.state.unlockedBadgeIds,
          totalXp: this.state.totalXp,
        })
      );
    } catch {}
  }

  public getState(): EduLabProgressState {
    return { ...this.state };
  }

  public subscribe(cb: (state: EduLabProgressState) => void) {
    this.listeners.push(cb);
    cb(this.getState());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  private notify(newlyUnlockedBadge?: LabBadge) {
    if (newlyUnlockedBadge) {
      this.state.lastUnlockedBadge = newlyUnlockedBadge;
    }
    this.saveToStorage();
    const currentState = this.getState();
    this.listeners.forEach((cb) => cb(currentState));
  }

  public isExperimentCompleted(expId: string): boolean {
    return this.state.completedExperiments.some((e) => e.experimentId === expId);
  }

  public recordExperimentCompletion(
    experimentId: string,
    filename: string,
    universityId: string,
    labId: string
  ): { newlyUnlockedBadges: LabBadge[] } {
    const existing = this.state.completedExperiments.find(
      (e) => e.experimentId === experimentId || e.filename === filename
    );

    if (!existing) {
      this.state.completedExperiments.push({
        experimentId,
        filename,
        universityId,
        labId,
        completedAt: new Date().toISOString(),
      });
      this.state.totalXp += 50; // +50 base XP per experiment completed
    }

    // Evaluate badges
    const newlyUnlocked: LabBadge[] = [];
    const completedCount = this.state.completedExperiments.length;
    const completedUniversities = new Set(
      this.state.completedExperiments.map((e) => e.universityId)
    );
    const completedPythonCount = this.state.completedExperiments.filter(
      (e) => e.labId.includes('python') || e.filename.includes('python')
    ).length;
    const completedDsaCount = this.state.completedExperiments.filter(
      (e) => e.labId.includes('dsa') || e.filename.includes('dsa')
    ).length;

    LAB_BADGES.forEach((badge) => {
      if (this.state.unlockedBadgeIds.includes(badge.id)) return;

      let isUnlocked = false;
      if (badge.id === 'first-experiment' && completedCount >= 1) {
        isUnlocked = true;
      } else if (badge.id === 'python-prodigy' && completedPythonCount >= 3) {
        isUnlocked = true;
      } else if (badge.id === 'dsa-architect' && completedDsaCount >= 1) {
        isUnlocked = true;
      } else if (badge.id === 'multi-university' && completedUniversities.size >= 2) {
        isUnlocked = true;
      } else if (badge.id === 'execution-ace' && completedCount >= 5) {
        isUnlocked = true;
      } else if (badge.id === 'deans-honor-roll' && completedCount >= 8) {
        isUnlocked = true;
      }

      if (isUnlocked) {
        this.state.unlockedBadgeIds.push(badge.id);
        newlyUnlocked.push(badge);
        // Bonus XP
        const xpMatch = badge.reward.match(/\+(\d+[\d,]*)/);
        if (xpMatch) {
          const bonusXp = parseInt(xpMatch[1].replace(/,/g, ''), 10) || 100;
          this.state.totalXp += bonusXp;
        }
      }
    });

    this.notify(newlyUnlocked[0]);
    return { newlyUnlockedBadges: newlyUnlocked };
  }

  public recordRunByFilename(filename: string): { newlyUnlockedBadges: LabBadge[] } {
    // Find matching experiment in UNIVERSITIES_DATA
    for (const univ of UNIVERSITIES_DATA) {
      for (const lab of univ.labs) {
        for (const exp of lab.experiments) {
          if (exp.filename === filename || exp.filename.toLowerCase() === filename.toLowerCase()) {
            return this.recordExperimentCompletion(exp.id, exp.filename, univ.id, lab.id);
          }
        }
      }
    }
    return { newlyUnlockedBadges: [] };
  }

  public getBadgeProgress(badgeId: string): { current: number; total: number; percent: number } {
    const completedCount = this.state.completedExperiments.length;
    const completedUniversities = new Set(
      this.state.completedExperiments.map((e) => e.universityId)
    );
    const completedPythonCount = this.state.completedExperiments.filter(
      (e) => e.labId.includes('python') || e.filename.includes('python')
    ).length;
    const completedDsaCount = this.state.completedExperiments.filter(
      (e) => e.labId.includes('dsa') || e.filename.includes('dsa')
    ).length;

    switch (badgeId) {
      case 'first-experiment':
        return {
          current: Math.min(1, completedCount),
          total: 1,
          percent: Math.min(100, (completedCount / 1) * 100),
        };
      case 'python-prodigy':
        return {
          current: Math.min(3, completedPythonCount),
          total: 3,
          percent: Math.min(100, Math.round((completedPythonCount / 3) * 100)),
        };
      case 'dsa-architect':
        return {
          current: Math.min(1, completedDsaCount),
          total: 1,
          percent: Math.min(100, (completedDsaCount / 1) * 100),
        };
      case 'multi-university':
        return {
          current: Math.min(2, completedUniversities.size),
          total: 2,
          percent: Math.min(100, Math.round((completedUniversities.size / 2) * 100)),
        };
      case 'execution-ace':
        return {
          current: Math.min(5, completedCount),
          total: 5,
          percent: Math.min(100, Math.round((completedCount / 5) * 100)),
        };
      case 'deans-honor-roll':
        return {
          current: Math.min(8, completedCount),
          total: 8,
          percent: Math.min(100, Math.round((completedCount / 8) * 100)),
        };
      default:
        return { current: 0, total: 1, percent: 0 };
    }
  }

  public clearProgress() {
    this.state = {
      completedExperiments: [],
      unlockedBadgeIds: [],
      totalXp: 0,
      lastUnlockedBadge: null,
    };
    this.notify();
  }
}

export const eduLabProgress = new EduLabProgressService();

