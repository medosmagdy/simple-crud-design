-- Run sequentially, once, after initialization; these are administrative exercises.
ALTER TABLE Products ADD COLUMN Category VARCHAR(100);
ALTER TABLE Products DROP COLUMN Category;
ALTER TABLE Suppliers MODIFY ContactNumber VARCHAR(15) NOT NULL;
ALTER TABLE Products MODIFY ProductName VARCHAR(255) NOT NULL;
