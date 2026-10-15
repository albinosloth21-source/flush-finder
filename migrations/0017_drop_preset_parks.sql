-- Parks are not preset restrooms. Users drop pins on the actual stall.
delete from bathrooms
 where kind = 'park'
   and source is distinct from 'user';
