update reviews
set hours_open = '00:00', hours_close = '24:00', days_open = 'Sun,Mon,Tue,Wed,Thu,Fri,Sat'
where id in ('rev-gbc-whataburger-1', 'rev-gbc-cefco-1', 'rev-innout-1', 'rev-innout-2')
  and hours_open is null;

update reviews
set hours_open = '06:00', hours_close = '23:00', days_open = 'Sun,Mon,Tue,Wed,Thu,Fri,Sat'
where id like 'rev-gbc-walmart-%'
  and hours_open is null;

update reviews
set hours_open = '08:00', hours_close = '17:00', days_open = 'Mon,Tue,Wed,Thu,Fri'
where id like 'rev-gbc-cityhall-%'
  and hours_open is null;

update reviews
set hours_open = '05:00', hours_close = '23:00', days_open = 'Sun,Mon,Tue,Wed,Thu,Fri,Sat'
where id like 'rev-gbc-mcd-%'
  and hours_open is null;

update reviews
set hours_open = '10:00', hours_close = '21:00', days_open = 'Sun,Mon,Tue,Wed,Thu,Fri,Sat'
where id in ('rev-lib-1', 'rev-lib-2', 'rev-nyc-lib-1', 'rev-nyc-bp-1', 'rev-chi-2', 'rev-atx-1')
  and hours_open is null;

update reviews
set hours_open = '09:00', hours_close = '18:00', days_open = 'Mon,Tue,Wed,Thu,Fri,Sat,Sun'
where id in ('rev-gbc-lowes-2', 'rev-gbc-brook-1', 'rev-gbc-tractor-1', 'rev-wf-1', 'rev-safeway-1')
  and hours_open is null;
